import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import { TZDate } from "@date-fns/tz";
import { ORPCError } from "@orpc/server";
import { format, formatISO } from "date-fns";
import { and, count, eq, inArray, ne, or, sql } from "drizzle-orm";

import type {
	DeleteParams,
	InsertParams,
	ScoreDelta,
	ScoringRuleSet,
	Tx,
} from "./types";

const ALPHA_GAME_DUPLICATE_TIME_ZONE = "Europe/Vilnius";

function getBatchDuplicateKey(params: InsertParams): string {
	const localDay = format(
		new TZDate(params.qsoAt, ALPHA_GAME_DUPLICATE_TIME_ZONE),
		"yyyy-MM-dd"
	);
	return [
		params.contactCallsign,
		params.band,
		params.mode,
		params.operatorSquare,
		params.contactSquare ?? "",
		localDay,
	].join(":");
}

function getSameQsoDaySql(qsoAt: Date) {
	return sql`DATE(${qso.qsoAt} AT TIME ZONE ${ALPHA_GAME_DUPLICATE_TIME_ZONE}) = DATE(${formatISO(qsoAt)}::timestamptz AT TIME ZONE ${ALPHA_GAME_DUPLICATE_TIME_ZONE})`;
}

async function validateInsert(
	tx: Tx,
	params: InsertParams,
	options?: { excludeQsoId?: number }
): Promise<void> {
	const excludeOwnQso = options?.excludeQsoId
		? ne(qso.id, options.excludeQsoId)
		: undefined;
	const existing = await tx
		.select({ id: qso.id })
		.from(qso)
		.where(
			and(
				excludeOwnQso,
				eq(qso.userId, params.userId),
				eq(qso.seasonId, params.seasonId),
				eq(qso.contactCallsign, params.contactCallsign),
				eq(qso.band, params.band as typeof qso.band._.data),
				eq(qso.mode, params.mode as typeof qso.mode._.data),
				eq(qso.operatorSquare, params.operatorSquare),
				sql`${qso.contactSquare} IS NOT DISTINCT FROM ${params.contactSquare}`,
				getSameQsoDaySql(params.qsoAt)
			)
		)
		.limit(1);

	if (existing[0]) {
		throw new ORPCError("CONFLICT", {
			message: "Pakartotinis QSO pagal sezono taisykles",
		});
	}
}

async function filterBulkInserts(
	tx: Tx,
	params: InsertParams[]
): Promise<InsertParams[]> {
	if (params.length === 0) {
		return [];
	}

	const batchDeduped: InsertParams[] = [];
	for (const p of params) {
		const key = getBatchDuplicateKey(p);
		if (
			batchDeduped.some((existing) => getBatchDuplicateKey(existing) === key)
		) {
			continue;
		}
		batchDeduped.push(p);
	}

	const duplicateConditions = batchDeduped.map((p) =>
		and(
			eq(qso.contactCallsign, p.contactCallsign),
			eq(qso.band, p.band as typeof qso.band._.data),
			eq(qso.mode, p.mode as typeof qso.mode._.data),
			eq(qso.operatorSquare, p.operatorSquare),
			sql`${qso.contactSquare} IS NOT DISTINCT FROM ${p.contactSquare}`,
			getSameQsoDaySql(p.qsoAt)
		)
	);

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
				eq(qso.userId, batchDeduped[0]?.userId ?? ""),
				eq(qso.seasonId, batchDeduped[0]?.seasonId ?? 0),
				inArray(
					qso.contactCallsign,
					batchDeduped.map((p) => p.contactCallsign)
				),
				or(...duplicateConditions)
			)
		);

	const existingKeys = new Set(
		existingRows.map((row) =>
			getBatchDuplicateKey({
				band: row.band,
				contactCallsign: row.contactCallsign,
				contactSquare: row.contactSquare,
				mode: row.mode,
				operatorCallsign: "",
				operatorSquare: row.operatorSquare,
				qsoAt: row.qsoAt,
				seasonId: batchDeduped[0]?.seasonId ?? 0,
				team: "yellow",
				userId: batchDeduped[0]?.userId ?? "",
			})
		)
	);

	return batchDeduped.filter((p) => !existingKeys.has(getBatchDuplicateKey(p)));
}

function scoreInsert(_tx: Tx, params: InsertParams): Promise<ScoreDelta[]> {
	return Promise.resolve([
		{
			squareCode: params.operatorSquare,
			team: params.team,
			userId: params.userId,
			pointsDelta: 1,
		},
	]);
}

function scoreDelete(_tx: Tx, params: DeleteParams): Promise<ScoreDelta[]> {
	return Promise.resolve([
		{
			squareCode: params.operatorSquare,
			team: params.team,
			userId: params.userId,
			pointsDelta: -1,
		},
	]);
}

function scoreBulkInsert(params: InsertParams[]): ScoreDelta[] {
	if (params.length === 0) {
		return [];
	}

	const squareMap = new Map<string, ScoreDelta>();

	for (const p of params) {
		const key = `${p.operatorSquare}:${p.team}`;
		const existing = squareMap.get(key);
		if (existing) {
			existing.pointsDelta += 1;
		} else {
			squareMap.set(key, {
				squareCode: p.operatorSquare,
				team: p.team,
				userId: p.userId,
				pointsDelta: 1,
			});
		}
	}

	return [...squareMap.values()];
}

export const alphaRuleSet: ScoringRuleSet = {
	requiresContactSquare: false,
	usePerQsoScoring: false,
	computeExpectedScores: async (db, seasonId) => {
		const [squareRows, userRows] = await Promise.all([
			db
				.select({
					squareCode: qso.operatorSquare,
					team: qso.team,
					points: count(),
				})
				.from(qso)
				.innerJoin(user, eq(user.id, qso.userId))
				.where(and(eq(qso.seasonId, seasonId), eq(user.banned, false)))
				.groupBy(qso.operatorSquare, qso.team),
			db
				.select({
					userId: qso.userId,
					points: count(),
				})
				.from(qso)
				.innerJoin(user, eq(user.id, qso.userId))
				.where(and(eq(qso.seasonId, seasonId), eq(user.banned, false)))
				.groupBy(qso.userId),
		]);
		return {
			squareScores: squareRows.map((r) => ({
				squareCode: r.squareCode,
				team: r.team,
				points: Number(r.points),
			})),
			userScores: userRows.map((r) => ({
				userId: r.userId,
				points: Number(r.points),
			})),
		};
	},
	filterBulkInserts,
	validateInsert,
	scoreInsert,
	scoreDelete,
	scoreBulkInsert,
};
