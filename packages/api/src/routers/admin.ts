import { session, user } from "@WAL-GO/db/schema/auth";
import { newsletterSubscription } from "@WAL-GO/db/schema/newsletter";
import { qso } from "@WAL-GO/db/schema/qsos";
import { squareScore } from "@WAL-GO/db/schema/scoring";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import { cabrilloUpload } from "@WAL-GO/db/schema/uploads";
import { WALGO_NEWSLETTER_LOCALIZATION } from "@WAL-GO/email/newsletter-email";
import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { uploadNewsletterImage } from "../assets/newsletter-images";
import { adminProcedure } from "../index";
import { announceOwnershipChanges } from "../notifications/discord";
import {
	sendNewsletter,
	sendNewsletterTest,
} from "../notifications/newsletter";
import { getAudienceInfo } from "../notifications/subscriptions";
import {
	applyScoreDeltas,
	applyUserBanScoreChange,
	type OwnershipChange,
	recomputeSeasonScores,
} from "../scoring/apply-deltas";
import { computeScoreDrift, EMPTY_SEASON_DRIFT } from "../scoring/drift";
import { getScoringRuleSet } from "../scoring/index";

const TEAMS = ["yellow", "green", "red"] as const;
type Team = (typeof TEAMS)[number];

const createEmptyTeamCounts = (): Record<Team, number> => ({
	yellow: 0,
	green: 0,
	red: 0,
});

const deriveControlledSquaresBySeason = (
	rows: {
		seasonId: number;
		squareCode: string;
		team: Team;
		points: number;
	}[]
) => {
	const bySeasonSquare = new Map<
		string,
		{ seasonId: number; scores: Record<Team, number> }
	>();

	for (const row of rows) {
		const key = `${row.seasonId}:${row.squareCode}`;
		if (!bySeasonSquare.has(key)) {
			bySeasonSquare.set(key, {
				seasonId: row.seasonId,
				scores: createEmptyTeamCounts(),
			});
		}
		const square = bySeasonSquare.get(key);
		if (square) {
			square.scores[row.team] = row.points;
		}
	}

	const controlledSquaresBySeason = new Map<number, Record<Team, number>>();
	for (const { seasonId, scores } of bySeasonSquare.values()) {
		const maxPoints = Math.max(...TEAMS.map((team) => scores[team]));
		const leaders = TEAMS.filter((team) => scores[team] === maxPoints);
		const leader = leaders.length === 1 && maxPoints > 0 ? leaders[0] : null;

		if (leader) {
			if (!controlledSquaresBySeason.has(seasonId)) {
				controlledSquaresBySeason.set(seasonId, createEmptyTeamCounts());
			}
			const seasonCounts = controlledSquaresBySeason.get(seasonId);
			if (seasonCounts) {
				seasonCounts[leader] += 1;
			}
		}
	}

	return controlledSquaresBySeason;
};

const deriveTeamScoresBySeason = (
	rows: { seasonId: number; team: Team; points: number }[]
) => {
	const scoresBySeason = new Map<number, Record<Team, number>>();

	for (const row of rows) {
		if (!scoresBySeason.has(row.seasonId)) {
			scoresBySeason.set(row.seasonId, createEmptyTeamCounts());
		}
		const seasonScores = scoresBySeason.get(row.seasonId);
		if (seasonScores) {
			seasonScores[row.team] += row.points;
		}
	}

	return scoresBySeason;
};

function deriveSeasonStatus(
	startsAt: Date,
	endsAt: Date,
	now: Date
): "active" | "ended" | "upcoming" {
	if (now < startsAt) {
		return "upcoming";
	}
	if (now > endsAt) {
		return "ended";
	}
	return "active";
}

const listUsers = adminProcedure.handler(async ({ context }) => {
	const now = new Date();
	const [rows, currentSeason] = await Promise.all([
		context.db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				newsletterSubscribed: newsletterSubscription.subscribed,
				role: user.role,
				banned: user.banned,
				banReason: user.banReason,
				createdAt: user.createdAt,
			})
			.from(user)
			.leftJoin(
				newsletterSubscription,
				eq(newsletterSubscription.userId, user.id)
			)
			.orderBy(asc(user.createdAt)),
		context.db
			.select({ id: season.id })
			.from(season)
			.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
			.limit(1),
	]);

	const activeSeason = currentSeason[0];
	if (!activeSeason) {
		return rows.map((row) => ({
			...row,
			currentTeam: null,
			newsletterSubscribed: row.newsletterSubscribed ?? true,
		}));
	}

	const memberships = await context.db
		.select({
			userId: seasonMembership.userId,
			team: seasonMembership.team,
		})
		.from(seasonMembership)
		.where(eq(seasonMembership.seasonId, activeSeason.id));
	const teamByUserId = new Map(
		memberships.map((membership) => [membership.userId, membership.team])
	);

	return rows.map((row) => ({
		...row,
		currentTeam: teamByUserId.get(row.id) ?? null,
		newsletterSubscribed: row.newsletterSubscribed ?? true,
	}));
});

const setUserRole = adminProcedure
	.input(z.object({ userId: z.string(), role: z.enum(["user", "admin"]) }))
	.handler(async ({ context, input }) => {
		await context.db
			.update(user)
			.set({ role: input.role })
			.where(eq(user.id, input.userId));
	});

const banUser = adminProcedure
	.input(z.object({ userId: z.string(), banReason: z.string().optional() }))
	.handler(async ({ context, input }) => {
		if (input.userId === context.session.user.id) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Negalima užblokuoti savęs",
			});
		}
		const changes = await context.db.transaction(async (tx) => {
			const rows = await tx
				.select({ banned: user.banned })
				.from(user)
				.where(eq(user.id, input.userId))
				.for("update")
				.limit(1);
			const existing = rows[0];
			if (!existing) {
				throw new ORPCError("NOT_FOUND", { message: "Naudotojas nerastas" });
			}
			await tx
				.update(user)
				.set({ banned: true, banReason: input.banReason ?? null })
				.where(eq(user.id, input.userId));
			// Revoke active sessions: we ban via a raw update (not better-auth's
			// banUser endpoint), so the admin plugin only blocks re-login — it does
			// not invalidate an existing session. Without this, a banned user could
			// keep logging QSOs and re-add the points we just removed.
			await tx.delete(session).where(eq(session.userId, input.userId));
			if (existing.banned) {
				return [];
			}
			return await applyUserBanScoreChange(tx, input.userId, true);
		});

		announceOwnershipChanges(changes);
	});

const unbanUser = adminProcedure
	.input(z.object({ userId: z.string() }))
	.handler(async ({ context, input }) => {
		const changes = await context.db.transaction(async (tx) => {
			const rows = await tx
				.select({ banned: user.banned })
				.from(user)
				.where(eq(user.id, input.userId))
				.for("update")
				.limit(1);
			const existing = rows[0];
			if (!existing) {
				throw new ORPCError("NOT_FOUND", { message: "Naudotojas nerastas" });
			}
			await tx
				.update(user)
				.set({ banned: false, banReason: null })
				.where(eq(user.id, input.userId));
			if (existing.banned) {
				return await applyUserBanScoreChange(tx, input.userId, false);
			}
			return [];
		});

		announceOwnershipChanges(changes);
	});

const deleteUser = adminProcedure
	.input(z.object({ userId: z.string() }))
	.handler(async ({ context, input }) => {
		if (input.userId === context.session.user.id) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Negalima ištrinti savęs",
			});
		}
		const changes = await context.db.transaction(async (tx) => {
			const rows = await tx
				.select({ banned: user.banned })
				.from(user)
				.where(eq(user.id, input.userId))
				.for("update")
				.limit(1);
			const existing = rows[0];
			if (!existing) {
				throw new ORPCError("NOT_FOUND", { message: "Naudotojas nerastas" });
			}
			const banChanges = existing.banned
				? []
				: await applyUserBanScoreChange(tx, input.userId, true);
			await tx.delete(user).where(eq(user.id, input.userId));
			return banChanges;
		});

		announceOwnershipChanges(changes);
	});

const listSeasons = adminProcedure.handler(async ({ context }) => {
	// Transaction bypasses Hyperdrive's query cache so admin always sees
	// fresh data after mutations. Public seasons.list keeps its cache.
	const rows = await context.db.transaction((tx) =>
		tx.select().from(season).orderBy(asc(season.startsAt))
	);
	const now = new Date();
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		status: deriveSeasonStatus(row.startsAt, row.endsAt, now),
	}));
});

const seasonInput = z.object({
	name: z.string().trim().min(1).max(120),
	startsAt: z.iso.datetime(),
	endsAt: z.iso.datetime(),
});

function validateSeasonDates(startsAt: Date, endsAt: Date) {
	if (endsAt <= startsAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pabaigos data turi būti vėlesnė nei pradžios data",
		});
	}
}

const createSeason = adminProcedure
	.input(seasonInput)
	.handler(async ({ context, input }) => {
		const startsAt = new Date(input.startsAt);
		const endsAt = new Date(input.endsAt);
		validateSeasonDates(startsAt, endsAt);
		const rows = await context.db
			.insert(season)
			.values({ name: input.name, startsAt, endsAt })
			.returning();
		const row = rows[0];
		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
		return row;
	});

const updateSeason = adminProcedure
	.input(z.object({ id: z.number().int().positive() }).merge(seasonInput))
	.handler(async ({ context, input }) => {
		const startsAt = new Date(input.startsAt);
		const endsAt = new Date(input.endsAt);
		validateSeasonDates(startsAt, endsAt);
		const rows = await context.db
			.update(season)
			.set({ name: input.name, startsAt, endsAt })
			.where(eq(season.id, input.id))
			.returning();
		if (!rows[0]) {
			throw new ORPCError("NOT_FOUND", { message: "Sezonas nerastas" });
		}
	});

const deleteSeason = adminProcedure
	.input(z.object({ id: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		await context.db.delete(season).where(eq(season.id, input.id));
	});

const listMemberships = adminProcedure
	.input(z.object({ seasonId: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		const rows = await context.db
			.select({
				id: seasonMembership.id,
				team: seasonMembership.team,
				joinedAt: seasonMembership.joinedAt,
				userId: seasonMembership.userId,
				userName: user.name,
				userEmail: user.email,
			})
			.from(seasonMembership)
			.innerJoin(user, eq(seasonMembership.userId, user.id))
			.where(eq(seasonMembership.seasonId, input.seasonId))
			.orderBy(asc(user.name));
		return rows;
	});

const addMembership = adminProcedure
	.input(
		z.object({
			seasonId: z.number().int().positive(),
			userId: z.string(),
			team: z.enum(TEAMS),
		})
	)
	.handler(async ({ context, input }) => {
		const existing = await context.db
			.select()
			.from(seasonMembership)
			.where(eq(seasonMembership.userId, input.userId))
			.limit(1);

		const alreadyInSeason = existing.find((m) => m.seasonId === input.seasonId);
		if (alreadyInSeason) {
			throw new ORPCError("CONFLICT", {
				message: "Naudotojas jau yra šio sezono narys",
			});
		}

		const rows = await context.db
			.insert(seasonMembership)
			.values({
				seasonId: input.seasonId,
				userId: input.userId,
				team: input.team,
			})
			.returning();
		const row = rows[0];
		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
		return row;
	});

const removeMembership = adminProcedure
	.input(z.object({ membershipId: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		await context.db
			.delete(seasonMembership)
			.where(eq(seasonMembership.id, input.membershipId));
	});

const setMembershipTeam = adminProcedure
	.input(
		z.object({
			membershipId: z.number().int().positive(),
			team: z.enum(TEAMS),
		})
	)
	.handler(async ({ context, input }) => {
		const rows = await context.db
			.update(seasonMembership)
			.set({ team: input.team })
			.where(eq(seasonMembership.id, input.membershipId))
			.returning();
		if (!rows[0]) {
			throw new ORPCError("NOT_FOUND", { message: "Narystė nerasta" });
		}
	});

const listQsos = adminProcedure
	.input(z.object({ seasonId: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		const rows = await context.db
			.select({
				id: qso.id,
				qsoAt: qso.qsoAt,
				operatorCallsign: user.name,
				contactCallsign: qso.contactCallsign,
				band: qso.band,
				mode: qso.mode,
				operatorSquare: qso.operatorSquare,
				contactSquare: qso.contactSquare,
				team: qso.team,
			})
			.from(qso)
			.innerJoin(user, eq(qso.userId, user.id))
			.where(eq(qso.seasonId, input.seasonId))
			.orderBy(desc(qso.qsoAt), desc(qso.id));
		return rows;
	});

const listUserQsos = adminProcedure
	.input(z.object({ userId: z.string() }))
	.handler(async ({ context, input }) => {
		const rows = await context.db
			.select({
				id: qso.id,
				qsoAt: qso.qsoAt,
				contactCallsign: qso.contactCallsign,
				band: qso.band,
				mode: qso.mode,
				operatorSquare: qso.operatorSquare,
				contactSquare: qso.contactSquare,
				team: qso.team,
				seasonId: qso.seasonId,
				seasonName: season.name,
			})
			.from(qso)
			.innerJoin(season, eq(qso.seasonId, season.id))
			.where(eq(qso.userId, input.userId))
			.orderBy(desc(qso.qsoAt), desc(qso.id));
		return rows;
	});

const deleteQso = adminProcedure
	.input(z.object({ id: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		const changes = await context.db.transaction(async (tx) => {
			const existing = await tx
				.select()
				.from(qso)
				.where(eq(qso.id, input.id))
				.for("update")
				.limit(1);

			const qsoRow = existing[0];
			if (!qsoRow) {
				throw new ORPCError("NOT_FOUND", { message: "QSO nerastas" });
			}

			const ruleSet = getScoringRuleSet(qsoRow.seasonId);
			const deltas = await ruleSet.scoreDelete(tx, {
				contactSquare: qsoRow.contactSquare,
				operatorSquare: qsoRow.operatorSquare,
				team: qsoRow.team,
				userId: qsoRow.userId,
			});
			const ownershipChanges = await applyScoreDeltas(
				tx,
				qsoRow.seasonId,
				deltas
			);
			await tx.delete(qso).where(eq(qso.id, input.id));
			return ownershipChanges;
		});

		announceOwnershipChanges(changes);
	});

const deleteQsos = adminProcedure
	.input(
		z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) })
	)
	.handler(async ({ context, input }) => {
		const changes = await context.db.transaction(async (tx) => {
			const ownershipChanges: OwnershipChange[] = [];
			for (const id of input.ids) {
				const existing = await tx
					.select()
					.from(qso)
					.where(eq(qso.id, id))
					.for("update")
					.limit(1);

				const qsoRow = existing[0];
				if (!qsoRow) {
					continue;
				}

				const ruleSet = getScoringRuleSet(qsoRow.seasonId);
				const deltas = await ruleSet.scoreDelete(tx, {
					contactSquare: qsoRow.contactSquare,
					operatorSquare: qsoRow.operatorSquare,
					team: qsoRow.team,
					userId: qsoRow.userId,
				});
				ownershipChanges.push(
					...(await applyScoreDeltas(tx, qsoRow.seasonId, deltas))
				);
				await tx.delete(qso).where(eq(qso.id, id));
			}
			return ownershipChanges;
		});

		announceOwnershipChanges(changes);
	});

const recomputeScores = adminProcedure
	.input(z.object({ seasonId: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		await context.db.transaction((tx) =>
			recomputeSeasonScores(tx, input.seasonId)
		);
	});

const getDashboard = adminProcedure.handler(async ({ context }) => {
	const [
		totalUsersResult,
		seasons,
		qsoCounts,
		memberCounts,
		squareScoreRows,
		driftBySeason,
	] = await Promise.all([
		context.db.select({ count: count() }).from(user),
		context.db.select().from(season).orderBy(asc(season.startsAt)),
		context.db
			.select({ seasonId: qso.seasonId, count: count() })
			.from(qso)
			.groupBy(qso.seasonId),
		context.db
			.select({
				seasonId: seasonMembership.seasonId,
				team: seasonMembership.team,
				count: count(),
			})
			.from(seasonMembership)
			.groupBy(seasonMembership.seasonId, seasonMembership.team),
		context.db
			.select({
				seasonId: squareScore.seasonId,
				squareCode: squareScore.squareCode,
				team: squareScore.team,
				points: squareScore.points,
			})
			.from(squareScore),
		computeScoreDrift(context.db),
	]);

	const totalUsers = totalUsersResult[0]?.count ?? 0;
	const totalQsos = qsoCounts.reduce((acc, r) => acc + r.count, 0);
	const now = new Date();
	const controlledSquaresBySeason =
		deriveControlledSquaresBySeason(squareScoreRows);
	const teamScoresBySeason = deriveTeamScoresBySeason(squareScoreRows);

	const seasonStats = seasons.map((s) => {
		const qsoCount = qsoCounts.find((q) => q.seasonId === s.id)?.count ?? 0;
		const memberCount = (team: "yellow" | "green" | "red") =>
			memberCounts.find((m) => m.seasonId === s.id && m.team === team)?.count ??
			0;
		const teamScores = teamScoresBySeason.get(s.id) ?? createEmptyTeamCounts();
		const controlledSquares =
			controlledSquaresBySeason.get(s.id) ?? createEmptyTeamCounts();

		return {
			id: s.id,
			name: s.name,
			startsAt: s.startsAt,
			endsAt: s.endsAt,
			status: deriveSeasonStatus(s.startsAt, s.endsAt, now),
			qsoCount,
			memberCounts: {
				yellow: memberCount("yellow"),
				green: memberCount("green"),
				red: memberCount("red"),
			},
			teamScores: {
				yellow: teamScores.yellow,
				green: teamScores.green,
				red: teamScores.red,
			},
			controlledSquares: {
				yellow: controlledSquares.yellow,
				green: controlledSquares.green,
				red: controlledSquares.red,
			},
			drift: driftBySeason.get(s.id) ?? EMPTY_SEASON_DRIFT,
		};
	});

	return { totalUsers, totalQsos, seasons: seasonStats };
});

const getUpload = adminProcedure
	.input(z.object({ id: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		const rows = await context.db
			.select()
			.from(cabrilloUpload)
			.where(eq(cabrilloUpload.id, input.id))
			.limit(1);
		const row = rows[0];
		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: "Įkėlimas nerastas" });
		}
		return row;
	});

const listUploads = adminProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select({
			id: cabrilloUpload.id,
			uploadedAt: cabrilloUpload.uploadedAt,
			callsign: cabrilloUpload.callsign,
			format: cabrilloUpload.format,
			accepted: cabrilloUpload.accepted,
			skipped: cabrilloUpload.skipped,
			seasonId: cabrilloUpload.seasonId,
			seasonName: season.name,
		})
		.from(cabrilloUpload)
		.innerJoin(season, eq(cabrilloUpload.seasonId, season.id))
		.orderBy(desc(cabrilloUpload.uploadedAt));
	return rows;
});

const newsletterAudience = adminProcedure.handler(({ context }) =>
	getAudienceInfo(context.db)
);

const newsletterSectionInput = z.object({
	title: z.string().trim().min(1),
	body: z.string().trim().min(1),
	imageUrl: z.url().optional(),
	url: z.url().optional(),
	linkLabel: z.string().trim().min(1).optional(),
});

const newsletterContentInput = z.object({
	subject: z.string().trim().min(1).max(200),
	label: z.string().trim().max(120).optional(),
	heading: z.string().trim().min(1).max(200),
	intro: z.string().trim().max(2000).optional(),
	sections: z.array(newsletterSectionInput).max(20).optional(),
	ctaLabel: z.string().trim().max(120).optional(),
	ctaUrl: z.url().optional(),
});

const validateNewsletterCta = (
	input: z.infer<typeof newsletterContentInput>
) => {
	if ((input.ctaLabel ? 1 : 0) !== (input.ctaUrl ? 1 : 0)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Mygtuko tekstas ir nuoroda turi būti nurodyti kartu",
		});
	}
};

const newsletterContent = (input: z.infer<typeof newsletterContentInput>) => ({
	label: input.label,
	heading: input.heading,
	intro: input.intro,
	sections: input.sections,
	ctaLabel: input.ctaLabel,
	ctaUrl: input.ctaUrl,
	preview: input.intro,
	localization: WALGO_NEWSLETTER_LOCALIZATION,
});

const uploadNewsletterImageEndpoint = adminProcedure
	.input(z.object({ image: z.instanceof(File) }))
	.handler(({ input }) => uploadNewsletterImage(input.image));

const sendNewsletterTestMessage = adminProcedure
	.input(
		newsletterContentInput.extend({
			email: z.email(),
		})
	)
	.handler(async ({ input }) => {
		validateNewsletterCta(input);
		await sendNewsletterTest({
			email: input.email,
			subject: input.subject,
			content: newsletterContent(input),
		});
		return { sent: 1 };
	});

const sendNewsletterBroadcast = adminProcedure
	.input(newsletterContentInput)
	.handler(async ({ context, input }) => {
		validateNewsletterCta(input);
		const sent = await sendNewsletter({
			db: context.db,
			subject: input.subject,
			content: newsletterContent(input),
		});
		return { sent };
	});

export const adminRouter = {
	dashboard: getDashboard,
	newsletter: {
		audience: newsletterAudience,
		send: sendNewsletterBroadcast,
		sendTest: sendNewsletterTestMessage,
		uploadImage: uploadNewsletterImageEndpoint,
	},
	users: {
		list: listUsers,
		setRole: setUserRole,
		ban: banUser,
		unban: unbanUser,
		delete: deleteUser,
		qsos: listUserQsos,
	},
	seasons: {
		list: listSeasons,
		create: createSeason,
		update: updateSeason,
		delete: deleteSeason,
	},
	scores: {
		recompute: recomputeScores,
	},
	memberships: {
		list: listMemberships,
		add: addMembership,
		remove: removeMembership,
		setTeam: setMembershipTeam,
	},
	qsos: {
		list: listQsos,
		delete: deleteQso,
		deleteMany: deleteQsos,
	},
	uploads: {
		list: listUploads,
		get: getUpload,
	},
};
