import { QSO_BANDS, QSO_MODES, qso } from "@WAL-GO/db/schema/qsos";
import { userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import { ORPCError } from "@orpc/server";
import { formatISO, isAfter, isBefore, isValid, parseISO } from "date-fns";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { applyScoreDeltas } from "../scoring/apply-deltas";
import { getScoringRuleSet } from "../scoring/index";
import type { InsertParams, Tx } from "../scoring/types";
import { getCurrentSeason } from "./seasons";

const qsoInput = z.object({
	contactCallsign: z.string().trim().min(1).max(32),
	band: z.string().trim().pipe(z.enum(QSO_BANDS)),
	mode: z.string().trim().transform(normalizeValue).pipe(z.enum(QSO_MODES)),
	qsoAt: z.iso.datetime(),
	operatorSquare: z.string().trim().min(3).max(3),
	contactSquare: z.string().trim().min(3).max(3).nullable().optional(),
});

const listInput = z
	.object({
		seasonId: z.number().int().positive().optional(),
	})
	.optional();

const bulkCreateInput = z.object({
	qsos: z.array(qsoInput).min(1).max(1000),
});

const deleteQsoInput = z.object({
	id: z.number().int().positive(),
});

function normalizeValue(value: string) {
	return value.trim().toUpperCase();
}

function toNumber(value: number | string | null | undefined): number {
	return Number(value ?? 0);
}

function validateSquares(operatorSquare: string, contactSquare: string | null) {
	if (!isValidWalSquare(operatorSquare)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Neteisingas mano WAL kvadratas",
		});
	}
	if (contactSquare && !isValidWalSquare(contactSquare)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Neteisingas korespondento WAL kvadratas",
		});
	}
}

function serializeQso(row: typeof qso.$inferSelect) {
	return {
		id: row.id,
		contactCallsign: row.contactCallsign,
		band: row.band,
		mode: row.mode,
		qsoAt: row.qsoAt,
		operatorSquare: row.operatorSquare,
		contactSquare: row.contactSquare,
		team: row.team,
	};
}

function getExactDuplicateKey(params: InsertParams): string {
	return [
		params.contactCallsign,
		params.band,
		params.mode,
		formatISO(params.qsoAt),
		params.operatorSquare,
		params.contactSquare ?? "",
	].join(":");
}

async function rejectExactQsoDuplicate(tx: Tx, params: InsertParams) {
	const existing = await tx
		.select({ id: qso.id })
		.from(qso)
		.where(
			and(
				eq(qso.userId, params.userId),
				eq(qso.seasonId, params.seasonId),
				eq(qso.contactCallsign, params.contactCallsign),
				eq(qso.band, params.band as typeof qso.band._.data),
				eq(qso.mode, params.mode as typeof qso.mode._.data),
				eq(qso.qsoAt, params.qsoAt),
				eq(qso.operatorSquare, params.operatorSquare),
				sql`${qso.contactSquare} IS NOT DISTINCT FROM ${params.contactSquare}`
			)
		)
		.limit(1);

	if (existing[0]) {
		throw new ORPCError("CONFLICT", {
			message: "Toks QSO jau yra užregistruotas",
		});
	}
}

async function filterExactQsoDuplicates(
	tx: Tx,
	params: InsertParams[]
): Promise<InsertParams[]> {
	const batchSeen = new Set<string>();
	const batchDeduped = params.filter((p) => {
		const key = getExactDuplicateKey(p);
		if (batchSeen.has(key)) {
			return false;
		}
		batchSeen.add(key);
		return true;
	});

	const first = batchDeduped[0];
	if (!first) {
		return [];
	}

	const existingRows = await tx
		.select({
			band: qso.band,
			contactCallsign: qso.contactCallsign,
			contactSquare: qso.contactSquare,
			mode: qso.mode,
			operatorSquare: qso.operatorSquare,
			qsoAt: qso.qsoAt,
		})
		.from(qso)
		.where(
			and(
				eq(qso.userId, first.userId),
				eq(qso.seasonId, first.seasonId),
				inArray(
					qso.contactCallsign,
					batchDeduped.map((p) => p.contactCallsign)
				)
			)
		);

	const existingKeys = new Set(
		existingRows.map((row) =>
			getExactDuplicateKey({
				band: row.band,
				contactCallsign: row.contactCallsign,
				contactSquare: row.contactSquare,
				mode: row.mode,
				operatorSquare: row.operatorSquare,
				qsoAt: row.qsoAt,
				seasonId: first.seasonId,
				team: first.team,
				userId: first.userId,
			})
		)
	);

	return batchDeduped.filter((p) => !existingKeys.has(getExactDuplicateKey(p)));
}

const list = protectedProcedure
	.input(listInput)
	.handler(async ({ context, input }) => {
		const currentSeason =
			input?.seasonId === undefined ? await getCurrentSeason(context.db) : null;
		const resolvedSeasonId = input?.seasonId ?? currentSeason?.id;

		if (resolvedSeasonId === undefined) {
			return [];
		}

		const rows = await context.db
			.select()
			.from(qso)
			.where(
				and(
					eq(qso.userId, context.session.user.id),
					eq(qso.seasonId, resolvedSeasonId)
				)
			)
			.orderBy(desc(qso.qsoAt), desc(qso.id));

		return rows.map(serializeQso);
	});

const stats = protectedProcedure
	.input(listInput)
	.handler(async ({ context, input }) => {
		const currentSeason =
			input?.seasonId === undefined ? await getCurrentSeason(context.db) : null;
		const resolvedSeasonId = input?.seasonId ?? currentSeason?.id;

		if (resolvedSeasonId === undefined) {
			return {
				totalQsos: 0,
				uniqueSquares: 0,
				points: 0,
				uniqueContactCallsigns: 0,
			};
		}

		const qsoStatsRows = await context.db
			.select({
				totalQsos: sql<number>`count(*)`,
				uniqueSquares: sql<number>`count(distinct ${qso.operatorSquare})`,
				uniqueContactCallsigns: sql<number>`count(distinct ${qso.contactCallsign})`,
			})
			.from(qso)
			.where(
				and(
					eq(qso.userId, context.session.user.id),
					eq(qso.seasonId, resolvedSeasonId)
				)
			);

		const scoreRows = await context.db
			.select({ points: userSeasonScore.points })
			.from(userSeasonScore)
			.where(
				and(
					eq(userSeasonScore.userId, context.session.user.id),
					eq(userSeasonScore.seasonId, resolvedSeasonId)
				)
			)
			.limit(1);

		const qsoStats = qsoStatsRows[0];

		return {
			totalQsos: toNumber(qsoStats?.totalQsos),
			uniqueSquares: toNumber(qsoStats?.uniqueSquares),
			points: scoreRows[0]?.points ?? 0,
			uniqueContactCallsigns: toNumber(qsoStats?.uniqueContactCallsigns),
		};
	});

const create = protectedProcedure
	.input(qsoInput)
	.handler(async ({ context, input }) => {
		const operatorSquare = normalizeWalSquare(input.operatorSquare);
		const contactSquare = input.contactSquare
			? normalizeWalSquare(input.contactSquare)
			: null;

		validateSquares(operatorSquare, contactSquare);

		const qsoAt = parseISO(input.qsoAt);
		if (!isValid(qsoAt)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisinga QSO data arba laikas",
			});
		}

		const now = new Date();

		return await context.db.transaction(async (tx) => {
			const seasonRows = await tx
				.select()
				.from(season)
				.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
				.limit(1);

			const currentSeason = seasonRows[0];
			if (!currentSeason) {
				throw new ORPCError("NOT_FOUND", {
					message: "Šiuo metu sezonas nevyksta",
				});
			}

			if (
				isBefore(qsoAt, currentSeason.startsAt) ||
				isAfter(qsoAt, currentSeason.endsAt)
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "QSO data nepatenka į sezono laikotarpį",
				});
			}

			const membershipRows = await tx
				.select()
				.from(seasonMembership)
				.where(
					and(
						eq(seasonMembership.userId, context.session.user.id),
						eq(seasonMembership.seasonId, currentSeason.id)
					)
				)
				.for("update")
				.limit(1);

			if (!membershipRows[0]) {
				throw new ORPCError("FORBIDDEN", {
					message: "Pirma prisijunkite prie sezono",
				});
			}

			const team = membershipRows[0].team;
			const userId = context.session.user.id;
			const contactCallsign = normalizeValue(input.contactCallsign);
			const ruleSet = getScoringRuleSet(currentSeason.id);

			const insertParams: InsertParams = {
				band: input.band,
				contactCallsign,
				contactSquare,
				mode: input.mode,
				operatorSquare,
				qsoAt,
				seasonId: currentSeason.id,
				team,
				userId,
			};

			await rejectExactQsoDuplicate(tx, insertParams);
			await ruleSet.validateInsert(tx, insertParams);

			const rows = await tx
				.insert(qso)
				.values({
					userId,
					seasonId: currentSeason.id,
					contactCallsign,
					band: input.band,
					mode: input.mode,
					qsoAt,
					team,
					operatorSquare,
					contactSquare,
				})
				.returning();

			const created = rows[0];
			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Nepavyko išsaugoti QSO",
				});
			}

			const deltas = await ruleSet.scoreInsert(tx, insertParams);
			await applyScoreDeltas(tx, currentSeason.id, deltas);

			return serializeQso(created);
		});
	});

const bulkCreate = protectedProcedure
	.input(bulkCreateInput)
	.handler(async ({ context, input }) => {
		const now = new Date();

		return await context.db.transaction(async (tx) => {
			const seasonRows = await tx
				.select()
				.from(season)
				.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
				.limit(1);

			const currentSeason = seasonRows[0];
			if (!currentSeason) {
				throw new ORPCError("NOT_FOUND", {
					message: "Šiuo metu sezonas nevyksta",
				});
			}

			const membershipRows = await tx
				.select()
				.from(seasonMembership)
				.where(
					and(
						eq(seasonMembership.userId, context.session.user.id),
						eq(seasonMembership.seasonId, currentSeason.id)
					)
				)
				.for("update")
				.limit(1);

			if (!membershipRows[0]) {
				throw new ORPCError("FORBIDDEN", {
					message: "Pirma prisijunkite prie sezono",
				});
			}

			const team = membershipRows[0].team;
			const userId = context.session.user.id;

			// Normalize and filter to valid QSOs within season window
			const normalized = input.qsos.flatMap((q) => {
				const operatorSquare = normalizeWalSquare(q.operatorSquare);
				const contactSquare = q.contactSquare
					? normalizeWalSquare(q.contactSquare)
					: null;
				const qsoAt = parseISO(q.qsoAt);
				if (!isValidWalSquare(operatorSquare)) {
					return [];
				}
				if (contactSquare && !isValidWalSquare(contactSquare)) {
					return [];
				}
				if (!isValid(qsoAt)) {
					return [];
				}
				if (
					isBefore(qsoAt, currentSeason.startsAt) ||
					isAfter(qsoAt, currentSeason.endsAt)
				) {
					return [];
				}
				return [
					{
						contactCallsign: normalizeValue(q.contactCallsign),
						band: q.band,
						mode: q.mode,
						qsoAt,
						operatorSquare,
						contactSquare,
					},
				];
			});

			if (normalized.length === 0) {
				return [];
			}

			const insertParams: InsertParams[] = normalized.map((q) => ({
				band: q.band,
				contactCallsign: q.contactCallsign,
				contactSquare: q.contactSquare,
				mode: q.mode,
				operatorSquare: q.operatorSquare,
				qsoAt: q.qsoAt,
				seasonId: currentSeason.id,
				team,
				userId,
			}));

			const exactDeduped = await filterExactQsoDuplicates(tx, insertParams);
			const ruleSet = getScoringRuleSet(currentSeason.id);
			const toInsert = await ruleSet.filterBulkInserts(tx, exactDeduped);

			if (toInsert.length === 0) {
				return [];
			}

			const inserted = await tx
				.insert(qso)
				.values(
					toInsert.map((q) => ({
						userId,
						seasonId: currentSeason.id,
						contactCallsign: q.contactCallsign,
						band: q.band as typeof qso.band._.data,
						mode: q.mode as typeof qso.mode._.data,
						qsoAt: q.qsoAt,
						team,
						operatorSquare: q.operatorSquare,
						contactSquare: q.contactSquare,
					}))
				)
				.returning();

			const deltas = ruleSet.scoreBulkInsert(toInsert);
			await applyScoreDeltas(tx, currentSeason.id, deltas);

			return inserted.map(serializeQso);
		});
	});

const deleteQso = protectedProcedure.input(deleteQsoInput).handler(
	async ({ context, input }) =>
		await context.db.transaction(async (tx) => {
			const existing = await tx
				.select()
				.from(qso)
				.where(
					and(eq(qso.id, input.id), eq(qso.userId, context.session.user.id))
				)
				.for("update")
				.limit(1);

			const qsoRow = existing[0];
			if (!qsoRow) {
				throw new ORPCError("NOT_FOUND", {
					message: "QSO nerastas",
				});
			}

			const seasonRows = await tx
				.select({ endsAt: season.endsAt })
				.from(season)
				.where(eq(season.id, qsoRow.seasonId))
				.limit(1);

			const now = new Date();
			if (seasonRows[0] && isAfter(now, seasonRows[0].endsAt)) {
				throw new ORPCError("FORBIDDEN", {
					message: "Negalima trinti QSO pasibaigus sezonui",
				});
			}

			const ruleSet = getScoringRuleSet(qsoRow.seasonId);
			const deltas = await ruleSet.scoreDelete(tx, {
				operatorSquare: qsoRow.operatorSquare,
				team: qsoRow.team,
				userId: qsoRow.userId,
			});
			await applyScoreDeltas(tx, qsoRow.seasonId, deltas);

			await tx.delete(qso).where(eq(qso.id, input.id));

			return serializeQso(qsoRow);
		})
);

export const qsosRouter = {
	list,
	stats,
	create,
	bulkCreate,
	delete: deleteQso,
};
