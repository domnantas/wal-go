import type { createDb } from "@WAL-GO/db";
import { season } from "@WAL-GO/db/schema/seasons";
import { asc, eq, TransactionRollbackError } from "drizzle-orm";

import type { AchievementUnlock } from "./evaluate";
import { syncAchievements } from "./evaluate";

type Db = Awaited<ReturnType<typeof createDb>>;

export interface BackfillResult {
	seasonId: number;
	seasonName: string;
	unlocked: number;
}

/**
 * Reconciles stats and achievements for every season, or a single one.
 *
 * Needed once after deploying achievements (existing seasons have never passed
 * through the sync chokepoint), and any time the catalogue gains an achievement
 * that ended seasons should be able to award — an ended season receives no
 * further writes, so nothing else would ever evaluate it.
 *
 * Every season runs in one transaction, so a dry run's counts match what a real
 * run would write: a career-scoped achievement unlocked while reconciling the
 * first season stays unlocked for the rest of the pass instead of being counted
 * again per season. A dry run rolls that transaction back — `tx.rollback()`
 * signals it by throwing, which is the expected path here, not a failure.
 */
export async function backfillAchievements(
	db: Db,
	options: { dryRun?: boolean; seasonId?: number } = {}
): Promise<BackfillResult[]> {
	const dryRun = options.dryRun ?? false;
	const seasons = await db
		.select({ id: season.id, name: season.name })
		.from(season)
		.where(options.seasonId ? eq(season.id, options.seasonId) : undefined)
		.orderBy(asc(season.id));

	const results: BackfillResult[] = [];
	try {
		await db.transaction(async (tx) => {
			for (const target of seasons) {
				const unlocks: AchievementUnlock[] = await syncAchievements(
					tx,
					target.id
				);
				results.push({
					seasonId: target.id,
					seasonName: target.name,
					unlocked: unlocks.length,
				});
			}
			if (dryRun) {
				tx.rollback();
			}
		});
	} catch (error) {
		if (!(error instanceof TransactionRollbackError)) {
			throw error;
		}
	}
	return results;
}
