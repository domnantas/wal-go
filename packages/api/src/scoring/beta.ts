import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import { TZDate } from "@date-fns/tz";
import { ORPCError } from "@orpc/server";
import { format, formatISO } from "date-fns";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";

import type {
	DeleteParams,
	ExpectedScores,
	InsertParams,
	QsoScore,
	ScoreDelta,
	ScoringRuleSet,
	Tx,
} from "./types";

const BETA_GAME_DUPLICATE_TIME_ZONE = "Europe/Vilnius";
const CONFIRMATION_WINDOW_SECONDS = 300;

function getBasePoints(mode: string): number {
	return mode === "DIGI" ? 1 : 2;
}

interface ConfirmingQso {
	id: number;
	mode: string;
	operatorSquare: string;
	team: "green" | "red" | "yellow";
	userId: string;
}

async function findConfirmingQso(
	tx: Tx,
	params: {
		band: string;
		contactCallsign: string;
		contactSquare: string;
		mode: string;
		operatorCallsign: string;
		operatorSquare: string;
		qsoAt: Date;
		seasonId: number;
		excludeQsoId?: number;
	}
): Promise<ConfirmingQso | null> {
	const excludeSelf = params.excludeQsoId
		? ne(qso.id, params.excludeQsoId)
		: undefined;

	const rows = await tx
		.select({
			id: qso.id,
			mode: qso.mode,
			operatorSquare: qso.operatorSquare,
			team: qso.team,
			userId: qso.userId,
		})
		.from(qso)
		.innerJoin(user, and(eq(user.id, qso.userId), eq(user.banned, false)))
		.where(
			and(
				excludeSelf,
				eq(qso.seasonId, params.seasonId),
				// The other station logged our callsign as their contact
				eq(qso.contactCallsign, params.operatorCallsign),
				// The other station is identified by their user record matching the contact callsign we logged
				sql`UPPER(${user.name}) = ${params.contactCallsign}`,
				eq(qso.band, params.band as typeof qso.band._.data),
				eq(qso.mode, params.mode as typeof qso.mode._.data),
				// Squares are swapped: their operator square = our contact square, and vice versa
				eq(qso.operatorSquare, params.contactSquare),
				eq(qso.contactSquare, params.operatorSquare),
				sql`ABS(EXTRACT(EPOCH FROM (${qso.qsoAt} - ${formatISO(params.qsoAt)}::timestamptz))) <= ${CONFIRMATION_WINDOW_SECONDS}`
			)
		)
		.limit(1);

	return rows[0] ?? null;
}

function getBatchDuplicateKey(params: InsertParams): string {
	const localDay = format(
		new TZDate(params.qsoAt, BETA_GAME_DUPLICATE_TIME_ZONE),
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
	return sql`DATE(${qso.qsoAt} AT TIME ZONE ${BETA_GAME_DUPLICATE_TIME_ZONE}) = DATE(${formatISO(qsoAt)}::timestamptz AT TIME ZONE ${BETA_GAME_DUPLICATE_TIME_ZONE})`;
}

async function validateInsert(
	tx: Tx,
	params: InsertParams,
	options?: { excludeQsoId?: number }
): Promise<void> {
	if (!params.contactSquare) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Korespondento WAL kvadratas privalomas",
		});
	}

	if (params.contactSquare === params.operatorSquare) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Korespondento WAL kvadratas negali sutapti su operatoriaus kvadratu",
		});
	}

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
				operatorSquare: row.operatorSquare,
				qsoAt: row.qsoAt,
				seasonId: first.seasonId,
				team: "yellow",
				operatorCallsign: "",
				userId: first.userId,
			})
		)
	);

	return batchDeduped.filter((p) => !existingKeys.has(getBatchDuplicateKey(p)));
}

async function scoreInsert(
	tx: Tx,
	params: InsertParams
): Promise<ScoreDelta[]> {
	const base = getBasePoints(params.mode);
	const confirming = params.contactSquare
		? await findConfirmingQso(tx, {
				band: params.band,
				contactCallsign: params.contactCallsign,
				contactSquare: params.contactSquare,
				mode: params.mode,
				operatorCallsign: params.operatorCallsign,
				operatorSquare: params.operatorSquare,
				qsoAt: params.qsoAt,
				seasonId: params.seasonId,
			})
		: null;

	const deltas: ScoreDelta[] = [
		{
			squareCode: params.operatorSquare,
			team: params.team,
			userId: params.userId,
			pointsDelta: base * (confirming ? 2 : 1),
		},
	];

	if (confirming) {
		deltas.push({
			squareCode: confirming.operatorSquare,
			team: confirming.team,
			userId: confirming.userId,
			pointsDelta: getBasePoints(confirming.mode),
		});
	}

	return deltas;
}

async function scoreDelete(
	tx: Tx,
	params: DeleteParams
): Promise<ScoreDelta[]> {
	const base = getBasePoints(params.mode);
	const confirming = params.contactSquare
		? await findConfirmingQso(tx, {
				band: params.band,
				contactCallsign: params.contactCallsign,
				contactSquare: params.contactSquare,
				mode: params.mode,
				operatorCallsign: params.operatorCallsign,
				operatorSquare: params.operatorSquare,
				qsoAt: params.qsoAt,
				seasonId: params.seasonId,
				excludeQsoId: params.qsoId,
			})
		: null;

	if (confirming) {
		return [
			{
				squareCode: params.operatorSquare,
				team: params.team,
				userId: params.userId,
				pointsDelta: -(base * 2),
			},
			{
				squareCode: confirming.operatorSquare,
				team: confirming.team,
				userId: confirming.userId,
				pointsDelta: -getBasePoints(confirming.mode),
			},
		];
	}

	return [
		{
			squareCode: params.operatorSquare,
			team: params.team,
			userId: params.userId,
			pointsDelta: -base,
		},
	];
}

function scoreBulkInsert(params: InsertParams[]): ScoreDelta[] {
	// For beta, bulk scoring uses base points only.
	// Confirmation bonuses are applied per-QSO via scoreInsert (usePerQsoScoring: true).
	if (params.length === 0) {
		return [];
	}

	const squareMap = new Map<string, ScoreDelta>();
	for (const p of params) {
		const key = `${p.operatorSquare}:${p.team}`;
		const existing = squareMap.get(key);
		const pts = getBasePoints(p.mode);
		if (existing) {
			existing.pointsDelta += pts;
		} else {
			squareMap.set(key, {
				squareCode: p.operatorSquare,
				team: p.team,
				userId: p.userId,
				pointsDelta: pts,
			});
		}
	}

	return [...squareMap.values()];
}

interface SeasonQsoRow {
	band: string;
	contactCallsign: string;
	contactSquare: string | null;
	id: number;
	mode: string;
	operatorSquare: string;
	qsoAt: Date;
	team: "green" | "red" | "yellow";
	userId: string;
	userName: string;
}

/** Load all non-banned QSOs for a season with the fields scoring needs. */
function loadSeasonQsos(
	db: Parameters<ScoringRuleSet["computeExpectedScores"]>[0],
	seasonId: number
): Promise<SeasonQsoRow[]> {
	return db
		.select({
			id: qso.id,
			userId: qso.userId,
			team: qso.team,
			operatorSquare: qso.operatorSquare,
			contactSquare: qso.contactSquare,
			contactCallsign: qso.contactCallsign,
			band: qso.band,
			mode: qso.mode,
			qsoAt: qso.qsoAt,
			userName: user.name,
		})
		.from(qso)
		.innerJoin(user, and(eq(user.id, qso.userId), eq(user.banned, false)))
		.where(eq(qso.seasonId, seasonId));
}

/** Ids of QSOs that have a reciprocal confirming QSO within the time window. */
function detectConfirmedIds(qsoRows: SeasonQsoRow[]): Set<number> {
	const byCallsign = new Map<string, SeasonQsoRow[]>();
	for (const row of qsoRows) {
		const key = row.userName.toUpperCase();
		const list = byCallsign.get(key) ?? [];
		list.push(row);
		byCallsign.set(key, list);
	}

	const confirmedIds = new Set<number>();
	for (const q of qsoRows) {
		if (!q.contactSquare) {
			continue;
		}
		const candidates = byCallsign.get(q.contactCallsign) ?? [];
		for (const c of candidates) {
			if (
				c.contactCallsign === q.userName.toUpperCase() &&
				c.band === q.band &&
				c.mode === q.mode &&
				c.operatorSquare === q.contactSquare &&
				c.contactSquare === q.operatorSquare &&
				Math.abs(c.qsoAt.getTime() - q.qsoAt.getTime()) <=
					CONFIRMATION_WINDOW_SECONDS * 1000
			) {
				confirmedIds.add(q.id);
				break;
			}
		}
	}

	return confirmedIds;
}

async function scoreSeasonQsos(
	db: Parameters<ScoringRuleSet["scoreSeasonQsos"]>[0],
	seasonId: number
): Promise<Map<number, QsoScore>> {
	const qsoRows = await loadSeasonQsos(db, seasonId);
	const confirmedIds = detectConfirmedIds(qsoRows);

	return new Map(
		qsoRows.map((q) => {
			const confirmed = confirmedIds.has(q.id);
			return [
				q.id,
				{ points: getBasePoints(q.mode) * (confirmed ? 2 : 1), confirmed },
			];
		})
	);
}

async function computeExpectedScores(
	db: Parameters<ScoringRuleSet["computeExpectedScores"]>[0],
	seasonId: number
): Promise<ExpectedScores> {
	const qsoRows = await loadSeasonQsos(db, seasonId);
	const confirmedIds = detectConfirmedIds(qsoRows);

	// Aggregate points
	const squareMap = new Map<
		string,
		{ squareCode: string; team: "yellow" | "green" | "red"; points: number }
	>();
	const userMap = new Map<string, number>();

	for (const q of qsoRows) {
		const base = getBasePoints(q.mode);
		const pts = base * (confirmedIds.has(q.id) ? 2 : 1);

		const squareKey = `${q.operatorSquare}:${q.team}`;
		const existing = squareMap.get(squareKey);
		if (existing) {
			existing.points += pts;
		} else {
			squareMap.set(squareKey, {
				squareCode: q.operatorSquare,
				team: q.team,
				points: pts,
			});
		}

		userMap.set(q.userId, (userMap.get(q.userId) ?? 0) + pts);
	}

	return {
		squareScores: [...squareMap.values()],
		userScores: [...userMap.entries()].map(([userId, points]) => ({
			userId,
			points,
		})),
	};
}

export const betaRuleSet: ScoringRuleSet = {
	requiresContactSquare: true,
	usePerQsoScoring: true,
	computeExpectedScores,
	filterBulkInserts,
	validateInsert,
	scoreInsert,
	scoreDelete,
	scoreBulkInsert,
	scoreSeasonQsos,
};
