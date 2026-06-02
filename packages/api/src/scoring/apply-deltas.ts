import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import { squareScore, userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import { computeLeader, type Team } from "./control";
import type { ScoreDelta, Tx } from "./types";

/** A square whose controlling team changed as a result of applied deltas. */
export interface OwnershipChange {
	after: Team | null;
	before: Team | null;
	squareCode: string;
}

/**
 * Snapshots the controlling team for each given square in a season. Squares
 * with no stored rows resolve to uncontrolled (`null`).
 */
async function snapshotLeaders(
	tx: Tx,
	seasonId: number,
	squareCodes: string[]
): Promise<Map<string, Team | null>> {
	const leaders = new Map<string, Team | null>();
	if (squareCodes.length === 0) {
		return leaders;
	}

	const rows: { squareCode: string; team: Team; points: number }[] = await tx
		.select({
			squareCode: squareScore.squareCode,
			team: squareScore.team,
			points: squareScore.points,
		})
		.from(squareScore)
		.where(
			and(
				eq(squareScore.seasonId, seasonId),
				inArray(squareScore.squareCode, squareCodes)
			)
		);

	const scoresByCode = new Map<string, Record<Team, number>>(
		squareCodes.map((code) => [code, { yellow: 0, green: 0, red: 0 }])
	);
	for (const row of rows) {
		const scores = scoresByCode.get(row.squareCode);
		if (scores) {
			scores[row.team] = row.points;
		}
	}

	for (const [code, scores] of scoresByCode) {
		leaders.set(code, computeLeader(scores));
	}
	return leaders;
}

export async function applyScoreDeltas(
	tx: Tx,
	seasonId: number,
	deltas: ScoreDelta[]
): Promise<OwnershipChange[]> {
	if (deltas.length === 0) {
		return [];
	}

	const affectedSquares = [...new Set(deltas.map((d) => d.squareCode))];
	const before = await snapshotLeaders(tx, seasonId, affectedSquares);

	const positiveDeltas = deltas.filter((d) => d.pointsDelta > 0);
	const negativeDeltas = deltas.filter((d) => d.pointsDelta < 0);

	if (positiveDeltas.length > 0) {
		await tx
			.insert(squareScore)
			.values(
				positiveDeltas.map((d) => ({
					seasonId,
					squareCode: d.squareCode,
					team: d.team,
					points: d.pointsDelta,
				}))
			)
			.onConflictDoUpdate({
				target: [
					squareScore.seasonId,
					squareScore.squareCode,
					squareScore.team,
				],
				set: {
					points: sql`${squareScore.points} + EXCLUDED.points`,
				},
			});
	}

	for (const delta of negativeDeltas) {
		await tx
			.update(squareScore)
			.set({ points: sql`${squareScore.points} + ${delta.pointsDelta}` })
			.where(
				and(
					eq(squareScore.seasonId, seasonId),
					eq(squareScore.squareCode, delta.squareCode),
					eq(squareScore.team, delta.team)
				)
			);
	}

	const userTotals = new Map<string, number>();
	for (const delta of deltas) {
		userTotals.set(
			delta.userId,
			(userTotals.get(delta.userId) ?? 0) + delta.pointsDelta
		);
	}

	const positiveUserTotals = [...userTotals.entries()].filter(
		([, points]) => points > 0
	);
	const negativeUserTotals = [...userTotals.entries()].filter(
		([, points]) => points < 0
	);

	if (positiveUserTotals.length > 0) {
		await tx
			.insert(userSeasonScore)
			.values(
				positiveUserTotals.map(([userId, points]) => ({
					seasonId,
					userId,
					points,
				}))
			)
			.onConflictDoUpdate({
				target: [userSeasonScore.seasonId, userSeasonScore.userId],
				set: {
					points: sql`${userSeasonScore.points} + EXCLUDED.points`,
				},
			});
	}

	for (const [userId, points] of negativeUserTotals) {
		await tx
			.update(userSeasonScore)
			.set({ points: sql`${userSeasonScore.points} + ${points}` })
			.where(
				and(
					eq(userSeasonScore.seasonId, seasonId),
					eq(userSeasonScore.userId, userId)
				)
			);
	}

	await tx
		.delete(squareScore)
		.where(and(eq(squareScore.seasonId, seasonId), eq(squareScore.points, 0)));

	await tx
		.delete(userSeasonScore)
		.where(
			and(eq(userSeasonScore.seasonId, seasonId), eq(userSeasonScore.points, 0))
		);

	const after = await snapshotLeaders(tx, seasonId, affectedSquares);
	return affectedSquares.flatMap((squareCode) => {
		const beforeLeader = before.get(squareCode) ?? null;
		const afterLeader = after.get(squareCode) ?? null;
		if (beforeLeader === afterLeader) {
			return [];
		}
		return [{ squareCode, before: beforeLeader, after: afterLeader }];
	});
}

/**
 * Removes (on ban) or restores (on unban) a user's accumulated points from the
 * materialized score tables, keeping the QSO rows untouched. The user's stored
 * QSOs are aggregated and applied as score deltas through {@link applyScoreDeltas},
 * which handles the symmetric decrement/increment, zero-row cleanup and the
 * per-user season totals.
 *
 * Banned points must not count toward the live map or leaderboard; this keeps
 * the stored aggregates consistent with that rule so the drift detector stays
 * clean. Call only when the banned state actually changes — applying it twice
 * would double-count.
 */
/**
 * Rebuilds a season's materialized score tables from the source-of-truth `qso`
 * table, excluding banned users. Wipes the season's `squareScore` and
 * `userSeasonScore` rows, then re-inserts the aggregates recomputed directly
 * from QSO rows. This mirrors the "expected" aggregation used by
 * {@link computeScoreDrift}, so after running it the season is guaranteed to be
 * drift-free.
 *
 * Use this as the repair action when the drift detector reports a mismatch
 * (a forgotten ban recompute, a delta-math bug, a direct DB edit, or a user
 * banned before ban-time enforcement shipped). It is idempotent — running it on
 * a healthy season leaves scores unchanged.
 *
 * Baseline assumption (same as the detector): expected points = count of stored
 * QSO rows, valid because the alpha rule set awards exactly one point per
 * accepted QSO and game duplicates are filtered at insert time. A future
 * non-trivial rule set must update this recompute alongside it.
 */
export async function recomputeSeasonScores(
	tx: Tx,
	seasonId: number
): Promise<void> {
	await tx.delete(squareScore).where(eq(squareScore.seasonId, seasonId));
	await tx
		.delete(userSeasonScore)
		.where(eq(userSeasonScore.seasonId, seasonId));

	const squareRows: {
		squareCode: string;
		team: ScoreDelta["team"];
		count: number;
	}[] = await tx
		.select({
			squareCode: qso.operatorSquare,
			team: qso.team,
			count: count(),
		})
		.from(qso)
		.innerJoin(user, eq(user.id, qso.userId))
		.where(and(eq(qso.seasonId, seasonId), eq(user.banned, false)))
		.groupBy(qso.operatorSquare, qso.team);

	if (squareRows.length > 0) {
		await tx.insert(squareScore).values(
			squareRows.map((row) => ({
				seasonId,
				squareCode: row.squareCode,
				team: row.team,
				points: row.count,
			}))
		);
	}

	const userRows: { userId: string; count: number }[] = await tx
		.select({
			userId: qso.userId,
			count: count(),
		})
		.from(qso)
		.innerJoin(user, eq(user.id, qso.userId))
		.where(and(eq(qso.seasonId, seasonId), eq(user.banned, false)))
		.groupBy(qso.userId);

	if (userRows.length > 0) {
		await tx.insert(userSeasonScore).values(
			userRows.map((row) => ({
				seasonId,
				userId: row.userId,
				points: row.count,
			}))
		);
	}
}

export async function applyUserBanScoreChange(
	tx: Tx,
	userId: string,
	banned: boolean
): Promise<OwnershipChange[]> {
	const rows = await tx
		.select({
			seasonId: qso.seasonId,
			squareCode: qso.operatorSquare,
			team: qso.team,
			count: count(),
		})
		.from(qso)
		.where(eq(qso.userId, userId))
		.groupBy(qso.seasonId, qso.operatorSquare, qso.team);

	const sign = banned ? -1 : 1;
	const deltasBySeason = new Map<number, ScoreDelta[]>();
	for (const row of rows) {
		const deltas = deltasBySeason.get(row.seasonId) ?? [];
		deltas.push({
			squareCode: row.squareCode,
			team: row.team,
			userId,
			pointsDelta: sign * row.count,
		});
		deltasBySeason.set(row.seasonId, deltas);
	}

	const changesBySeason: OwnershipChange[][] = [];
	for (const [seasonId, deltas] of deltasBySeason) {
		changesBySeason.push(await applyScoreDeltas(tx, seasonId, deltas));
	}
	return changesBySeason.flat();
}
