import type { createDb } from "@WAL-GO/db";
import { qso } from "@WAL-GO/db/schema/qsos";
import {
	squareControlHistory,
	squareScore,
	userSeasonScore,
} from "@WAL-GO/db/schema/scoring";
import { season } from "@WAL-GO/db/schema/seasons";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { computeLeader, type Team } from "./control";
import { getScoringRuleSet } from "./index";
import type { ScoreDelta, Tx } from "./types";

type Db = Awaited<ReturnType<typeof createDb>>;

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

	const squareTotals = new Map<
		string,
		{ squareCode: string; team: ScoreDelta["team"]; points: number }
	>();
	for (const delta of deltas) {
		const key = `${delta.squareCode}:${delta.team}`;
		const existing = squareTotals.get(key);
		if (existing) {
			existing.points += delta.pointsDelta;
		} else {
			squareTotals.set(key, {
				squareCode: delta.squareCode,
				team: delta.team,
				points: delta.pointsDelta,
			});
		}
	}

	const positiveSquareTotals = [...squareTotals.values()].filter(
		(s) => s.points > 0
	);

	if (positiveSquareTotals.length > 0) {
		await tx
			.insert(squareScore)
			.values(
				positiveSquareTotals.map((s) => ({
					seasonId,
					squareCode: s.squareCode,
					team: s.team,
					points: s.points,
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

	const negativeSquareTotals = [...squareTotals.values()].filter(
		(s) => s.points < 0
	);

	for (const square of negativeSquareTotals) {
		await tx
			.update(squareScore)
			.set({ points: sql`${squareScore.points} + ${square.points}` })
			.where(
				and(
					eq(squareScore.seasonId, seasonId),
					eq(squareScore.squareCode, square.squareCode),
					eq(squareScore.team, square.team)
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
	const changes = affectedSquares.flatMap((squareCode) => {
		const beforeLeader = before.get(squareCode) ?? null;
		const afterLeader = after.get(squareCode) ?? null;
		if (beforeLeader === afterLeader) {
			return [];
		}
		return [{ squareCode, before: beforeLeader, after: afterLeader }];
	});

	if (changes.length > 0) {
		await tx.insert(squareControlHistory).values(
			changes.map((change) => ({
				seasonId,
				squareCode: change.squareCode,
				beforeTeam: change.before,
				afterTeam: change.after,
			}))
		);
	}

	return changes;
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
/**
 * Reconciles the materialized per-QSO `score` / `confirmed` columns with the
 * rule set's authoritative per-QSO scoring for a whole season. Run inside the
 * same transaction as any write that can change scoring (insert, update,
 * delete, bulk import, ban recompute) so reads can serve the columns directly
 * instead of recomputing confirmation on every list request.
 *
 * Confirmation is symmetric and dynamic, so a single insert/delete can flip a
 * counterpart QSO too; recomputing the season and updating only the rows that
 * actually changed keeps this correct without bespoke per-path delta logic.
 * Banned users' QSOs are absent from the rule set's map and reconcile to 0,
 * matching their removal from the aggregate score tables.
 */
export async function syncQsoScores(tx: Tx, seasonId: number): Promise<void> {
	const seasonRows = await tx
		.select({ scoringRuleSet: season.scoringRuleSet })
		.from(season)
		.where(eq(season.id, seasonId))
		.limit(1);
	const ruleSet = getScoringRuleSet(seasonRows[0]?.scoringRuleSet ?? "alpha");

	// tx and Db share the same query interface in Drizzle
	const scores = await ruleSet.scoreSeasonQsos(tx as unknown as Db, seasonId);

	const stored = await tx
		.select({ id: qso.id, score: qso.score, confirmed: qso.confirmed })
		.from(qso)
		.where(eq(qso.seasonId, seasonId));

	for (const row of stored) {
		const target = scores.get(row.id) ?? { points: 0, confirmed: false };
		if (row.score === target.points && row.confirmed === target.confirmed) {
			continue;
		}
		await tx
			.update(qso)
			.set({
				score: target.points,
				confirmed: target.confirmed,
				// Preserve the user-facing edit timestamp: a scoring sync is not a QSO edit.
				updatedAt: sql`${qso.updatedAt}`,
			})
			.where(eq(qso.id, row.id));
	}
}

export async function recomputeSeasonScores(
	tx: Tx,
	seasonId: number
): Promise<void> {
	const seasonRows = await tx
		.select({ scoringRuleSet: season.scoringRuleSet })
		.from(season)
		.where(eq(season.id, seasonId))
		.limit(1);

	const ruleSet = getScoringRuleSet(seasonRows[0]?.scoringRuleSet ?? "alpha");

	// tx and Db share the same query interface in Drizzle
	const expected = await ruleSet.computeExpectedScores(
		tx as unknown as Db,
		seasonId
	);

	await tx.delete(squareScore).where(eq(squareScore.seasonId, seasonId));
	await tx
		.delete(userSeasonScore)
		.where(eq(userSeasonScore.seasonId, seasonId));

	if (expected.squareScores.length > 0) {
		await tx.insert(squareScore).values(
			expected.squareScores.map((row) => ({
				seasonId,
				squareCode: row.squareCode,
				team: row.team,
				points: row.points,
			}))
		);
	}

	if (expected.userScores.length > 0) {
		await tx.insert(userSeasonScore).values(
			expected.userScores.map((row) => ({
				seasonId,
				userId: row.userId,
				points: row.points,
			}))
		);
	}

	await syncQsoScores(tx, seasonId);
}

export async function applyUserBanScoreChange(
	tx: Tx,
	userId: string,
	banned: boolean
): Promise<OwnershipChange[]> {
	// Find all seasons where this user has QSOs
	const seasonIds = await tx
		.selectDistinct({ seasonId: qso.seasonId })
		.from(qso)
		.where(eq(qso.userId, userId));

	if (seasonIds.length === 0) {
		return [];
	}

	// Look up rule sets for affected seasons
	const seasonRows = await tx
		.select({ id: season.id, scoringRuleSet: season.scoringRuleSet })
		.from(season)
		.where(
			inArray(
				season.id,
				seasonIds.map((r) => r.seasonId)
			)
		);

	const changesBySeason: OwnershipChange[][] = [];

	for (const s of seasonRows) {
		const ruleSet = getScoringRuleSet(s.scoringRuleSet);

		if (ruleSet.usePerQsoScoring) {
			// Non-trivial scoring (e.g. beta): full recompute is the only correct approach
			// because ban changes confirmation bonus eligibility for other users too.
			// Snapshot ownership before and after to detect changes.
			const affectedSquareCodes = await tx
				.selectDistinct({ squareCode: qso.operatorSquare })
				.from(qso)
				.where(and(eq(qso.seasonId, s.id), eq(qso.userId, userId)));

			const codes = affectedSquareCodes.map((r) => r.squareCode);
			const before =
				codes.length > 0
					? await snapshotLeaders(tx, s.id, codes)
					: new Map<string, Team | null>();

			await recomputeSeasonScores(tx, s.id);

			const after =
				codes.length > 0
					? await snapshotLeaders(tx, s.id, codes)
					: new Map<string, Team | null>();

			const changes = codes.flatMap((code) => {
				const beforeLeader = before.get(code) ?? null;
				const afterLeader = after.get(code) ?? null;
				if (beforeLeader === afterLeader) {
					return [];
				}
				return [{ squareCode: code, before: beforeLeader, after: afterLeader }];
			});

			if (changes.length > 0) {
				await tx.insert(squareControlHistory).values(
					changes.map((change) => ({
						seasonId: s.id,
						squareCode: change.squareCode,
						beforeTeam: change.before,
						afterTeam: change.after,
					}))
				);
			}

			changesBySeason.push(changes);
		} else {
			// Alpha: simple count-based delta
			const rows = await tx
				.select({
					squareCode: qso.operatorSquare,
					team: qso.team,
					qsoCount: count(),
				})
				.from(qso)
				.where(and(eq(qso.seasonId, s.id), eq(qso.userId, userId)))
				.groupBy(qso.operatorSquare, qso.team);

			if (rows.length === 0) {
				continue;
			}

			const sign = banned ? -1 : 1;
			const deltas: ScoreDelta[] = rows.map((row) => ({
				squareCode: row.squareCode,
				team: row.team,
				userId,
				pointsDelta: sign * Number(row.qsoCount),
			}));

			changesBySeason.push(await applyScoreDeltas(tx, s.id, deltas));
			await syncQsoScores(tx, s.id);
		}
	}

	return changesBySeason.flat();
}
