import { squareScore, userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { and, eq, sql } from "drizzle-orm";

import type { ScoreDelta, Tx } from "./types";

export async function applyScoreDeltas(
	tx: Tx,
	seasonId: number,
	deltas: ScoreDelta[]
): Promise<void> {
	if (deltas.length === 0) {
		return;
	}

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
}
