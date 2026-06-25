import type { createDb } from "@WAL-GO/db";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import { ORPCError } from "@orpc/server";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { protectedProcedure, publicProcedure } from "../index";
import { getScoringRuleSet } from "../scoring/index";

const TEAMS = ["yellow", "green", "red"] as const;
type Team = (typeof TEAMS)[number];

type Db = ReturnType<typeof createDb>;

export async function getCurrentSeason(db: Db) {
	const now = new Date();
	const rows = await db
		.select()
		.from(season)
		.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
		.limit(1);
	return rows[0] ?? null;
}

async function pickWeightedTeam(db: Db, seasonId: string): Promise<Team> {
	const rows = await db
		.select({ team: seasonMembership.team, count: count() })
		.from(seasonMembership)
		.where(eq(seasonMembership.seasonId, seasonId))
		.groupBy(seasonMembership.team);

	const memberCount = new Map(rows.map((r) => [r.team, r.count]));

	// More members = lower weight = less likely to be picked
	const teamWeights = TEAMS.map((team) => ({
		team,
		weight: 1 / ((memberCount.get(team) ?? 0) + 1),
	}));

	const totalWeight = teamWeights.reduce((sum, { weight }) => sum + weight, 0);
	const threshold = Math.random() * totalWeight;

	let cumulative = 0;
	for (const { team, weight } of teamWeights) {
		cumulative += weight;
		if (threshold <= cumulative) {
			return team;
		}
	}
	return TEAMS.at(-1) ?? TEAMS[0];
}

function deriveStatus(
	startsAt: Date,
	endsAt: Date,
	now: Date
): "upcoming" | "active" | "ended" {
	if (now < startsAt) {
		return "upcoming";
	}
	if (now > endsAt) {
		return "ended";
	}
	return "active";
}

const current = publicProcedure.handler(async ({ context }) => {
	const row = await getCurrentSeason(context.db);
	if (!row) {
		return null;
	}
	const ruleSet = getScoringRuleSet(row.scoringRuleSet);
	return {
		id: row.id,
		name: row.name,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		scoringRuleSet: row.scoringRuleSet,
		requiresContactSquare: ruleSet.requiresContactSquare,
		rejectsSameSquare: ruleSet.rejectsSameSquare,
	};
});

const list = publicProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select()
		.from(season)
		.orderBy(asc(season.startsAt));
	const memberCountRows = await context.db
		.select({ seasonId: seasonMembership.seasonId, count: count() })
		.from(seasonMembership)
		.groupBy(seasonMembership.seasonId);
	const memberCounts = new Map(
		memberCountRows.map((r) => [r.seasonId, r.count])
	);
	const now = new Date();
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		scoringRuleSet: row.scoringRuleSet,
		status: deriveStatus(row.startsAt, row.endsAt, now),
		memberCount: memberCounts.get(row.id) ?? 0,
	}));
});

const participated = protectedProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select({
			id: season.id,
			name: season.name,
			startsAt: season.startsAt,
			endsAt: season.endsAt,
		})
		.from(seasonMembership)
		.innerJoin(season, eq(season.id, seasonMembership.seasonId))
		.where(eq(seasonMembership.userId, context.session.user.id))
		.orderBy(asc(season.startsAt));
	const now = new Date();
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		status: deriveStatus(row.startsAt, row.endsAt, now),
	}));
});

const myMembership = protectedProcedure.handler(async ({ context }) => {
	const currentSeason = await getCurrentSeason(context.db);
	if (!currentSeason) {
		return null;
	}
	const rows = await context.db
		.select()
		.from(seasonMembership)
		.where(
			and(
				eq(seasonMembership.userId, context.session.user.id),
				eq(seasonMembership.seasonId, currentSeason.id)
			)
		)
		.limit(1);
	const membership = rows[0];
	if (!membership) {
		return null;
	}
	return {
		team: membership.team,
		joinedAt: membership.joinedAt,
		season: {
			id: currentSeason.id,
			name: currentSeason.name,
		},
	};
});

const join = protectedProcedure.handler(async ({ context }) => {
	const currentSeason = await getCurrentSeason(context.db);
	if (!currentSeason) {
		throw new ORPCError("NOT_FOUND", {
			message: "Šiuo metu sezonas nevyksta",
		});
	}
	const userId = context.session.user.id;
	const seasonId = currentSeason.id;

	return await context.db.transaction(async (tx) => {
		const existing = await tx
			.select()
			.from(seasonMembership)
			.where(
				and(
					eq(seasonMembership.userId, userId),
					eq(seasonMembership.seasonId, seasonId)
				)
			)
			.limit(1);
		if (existing[0]) {
			return {
				team: existing[0].team,
				joinedAt: existing[0].joinedAt,
				season: {
					id: currentSeason.id,
					name: currentSeason.name,
				},
			};
		}

		await tx
			.insert(seasonMembership)
			.values({
				seasonId,
				userId,
				team: await pickWeightedTeam(tx, seasonId),
			})
			.onConflictDoNothing({
				target: [seasonMembership.userId, seasonMembership.seasonId],
			});

		const reselect = await tx
			.select()
			.from(seasonMembership)
			.where(
				and(
					eq(seasonMembership.userId, userId),
					eq(seasonMembership.seasonId, seasonId)
				)
			)
			.limit(1);

		const membership = reselect[0];
		if (!membership) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Nepavyko prisijungti prie sezono",
			});
		}
		return {
			team: membership.team,
			joinedAt: membership.joinedAt,
			season: {
				id: currentSeason.id,
				name: currentSeason.name,
			},
		};
	});
});

export const seasonsRouter = {
	current,
	list,
	participated,
	myMembership,
	join,
};
