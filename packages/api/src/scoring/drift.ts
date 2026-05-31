import type { createDb } from "@WAL-GO/db";
import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import { squareScore, userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { count, eq } from "drizzle-orm";

type Db = Awaited<ReturnType<typeof createDb>>;

export interface SeasonDrift {
	hasDrift: boolean;
	// Stored minus expected user points (positive => stored is too high).
	pointDifference: number;
	// Number of (square, team) keys where stored points !== expected points.
	squareMismatches: number;
	// Number of users where stored season points !== expected points.
	userMismatches: number;
}

export const EMPTY_SEASON_DRIFT: SeasonDrift = {
	squareMismatches: 0,
	userMismatches: 0,
	pointDifference: 0,
	hasDrift: false,
};

const KEY_SEPARATOR = "|";

/**
 * Compares the stored score aggregates against the scores recomputed from the
 * `qso` table, excluding banned users. The alpha rule set awards exactly one
 * point per stored QSO (game duplicates are filtered at insert time), so the
 * expected score for a group is simply the count of its QSO rows. If a future
 * season uses a non-trivial rule set, this baseline must be updated alongside
 * it (see docs/scoring.md).
 *
 * Any mismatch means the materialized score tables have drifted from the source
 * of truth — most commonly because a banned user's points were never removed.
 */
export async function computeScoreDrift(
	db: Db
): Promise<Map<number, SeasonDrift>> {
	const [expectedSquares, storedSquares, expectedUsers, storedUsers] =
		await Promise.all([
			db
				.select({
					seasonId: qso.seasonId,
					squareCode: qso.operatorSquare,
					team: qso.team,
					count: count(),
				})
				.from(qso)
				.innerJoin(user, eq(user.id, qso.userId))
				.where(eq(user.banned, false))
				.groupBy(qso.seasonId, qso.operatorSquare, qso.team),
			db
				.select({
					seasonId: squareScore.seasonId,
					squareCode: squareScore.squareCode,
					team: squareScore.team,
					points: squareScore.points,
				})
				.from(squareScore),
			db
				.select({
					seasonId: qso.seasonId,
					userId: qso.userId,
					count: count(),
				})
				.from(qso)
				.innerJoin(user, eq(user.id, qso.userId))
				.where(eq(user.banned, false))
				.groupBy(qso.seasonId, qso.userId),
			db
				.select({
					seasonId: userSeasonScore.seasonId,
					userId: userSeasonScore.userId,
					points: userSeasonScore.points,
				})
				.from(userSeasonScore),
		]);

	const drift = new Map<number, SeasonDrift>();
	const ensureSeason = (seasonId: number): SeasonDrift => {
		const existing = drift.get(seasonId);
		if (existing) {
			return existing;
		}
		const created: SeasonDrift = { ...EMPTY_SEASON_DRIFT };
		drift.set(seasonId, created);
		return created;
	};

	const expectedSquareMap = new Map<string, number>();
	for (const row of expectedSquares) {
		expectedSquareMap.set(
			`${row.seasonId}${KEY_SEPARATOR}${row.squareCode}${KEY_SEPARATOR}${row.team}`,
			row.count
		);
	}
	const storedSquareMap = new Map<string, number>();
	for (const row of storedSquares) {
		storedSquareMap.set(
			`${row.seasonId}${KEY_SEPARATOR}${row.squareCode}${KEY_SEPARATOR}${row.team}`,
			row.points
		);
	}
	for (const key of new Set([
		...expectedSquareMap.keys(),
		...storedSquareMap.keys(),
	])) {
		const expected = expectedSquareMap.get(key) ?? 0;
		const stored = storedSquareMap.get(key) ?? 0;
		if (expected !== stored) {
			const seasonId = Number(key.split(KEY_SEPARATOR)[0]);
			ensureSeason(seasonId).squareMismatches += 1;
		}
	}

	const expectedUserMap = new Map<string, number>();
	for (const row of expectedUsers) {
		expectedUserMap.set(
			`${row.seasonId}${KEY_SEPARATOR}${row.userId}`,
			row.count
		);
	}
	const storedUserMap = new Map<string, number>();
	for (const row of storedUsers) {
		storedUserMap.set(
			`${row.seasonId}${KEY_SEPARATOR}${row.userId}`,
			row.points
		);
	}
	for (const key of new Set([
		...expectedUserMap.keys(),
		...storedUserMap.keys(),
	])) {
		const expected = expectedUserMap.get(key) ?? 0;
		const stored = storedUserMap.get(key) ?? 0;
		if (expected !== stored) {
			const seasonId = Number(key.split(KEY_SEPARATOR)[0]);
			const season = ensureSeason(seasonId);
			season.userMismatches += 1;
			season.pointDifference += stored - expected;
		}
	}

	for (const season of drift.values()) {
		season.hasDrift = season.squareMismatches > 0 || season.userMismatches > 0;
	}

	return drift;
}
