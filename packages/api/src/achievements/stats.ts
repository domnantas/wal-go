import { userStat } from "@WAL-GO/db/schema/achievements";
import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Tx } from "../scoring/types";
import type { AchievementStats } from "./types";
import { EMPTY_STATS } from "./types";

const TIME_ZONE = "Europe/Vilnius";
const NIGHT_END_HOUR = 5;

/**
 * Longest run of consecutive Vilnius calendar days. Days arrive as `yyyy-MM-dd`
 * strings already grouped in the database.
 */
function longestStreak(days: string[]): number {
	if (days.length === 0) {
		return 0;
	}
	const dates = [...days].sort().map((day) => parseISO(day));
	return dates.reduce(
		(state, date, index) => {
			const previous = index > 0 ? dates[index - 1] : undefined;
			const run =
				previous !== undefined && differenceInCalendarDays(date, previous) === 1
					? state.run + 1
					: 1;
			return { run, best: Math.max(state.best, run) };
		},
		{ run: 0, best: 0 }
	).best;
}

export const vilniusDay = sql<string>`to_char(${qso.qsoAt} AT TIME ZONE ${sql.raw(`'${TIME_ZONE}'`)}, 'YYYY-MM-DD')`;

interface AggregateRow {
	bands: string[];
	confirmedCount: number;
	distinctCallsigns: number;
	distinctSquares: number;
	firstQsoAt: Date | null;
	lastQsoAt: Date | null;
	modes: string[];
	nightQsoCount: number;
	points: number;
	qsoCount: number;
	userId: string;
}

/**
 * Aggregates every counter that a single grouped query can produce. `scope`
 * narrows to one season; omitting it produces career totals, which cannot be
 * summed from season rows because the distinct counts would double-count.
 */
function aggregateQuery(tx: Tx, userIds: string[], seasonId?: number) {
	const scope = [
		inArray(qso.userId, userIds),
		eq(user.banned, false),
		...(seasonId === undefined ? [] : [eq(qso.seasonId, seasonId)]),
	];

	return tx
		.select({
			userId: qso.userId,
			qsoCount: sql<number>`count(*)::int`,
			points: sql<number>`coalesce(sum(${qso.score}), 0)::int`,
			confirmedCount: sql<number>`count(*) filter (where ${qso.confirmed})::int`,
			distinctCallsigns: sql<number>`count(distinct ${qso.contactCallsign})::int`,
			distinctSquares: sql<number>`count(distinct ${qso.operatorSquare})::int`,
			bands: sql<string[]>`array_agg(distinct ${qso.band}::text)`,
			modes: sql<string[]>`array_agg(distinct ${qso.mode}::text)`,
			nightQsoCount: sql<number>`count(*) filter (where extract(hour from ${qso.qsoAt} AT TIME ZONE ${sql.raw(`'${TIME_ZONE}'`)}) < ${NIGHT_END_HOUR})::int`,
			firstQsoAt: sql<Date | null>`min(${qso.qsoAt})`,
			lastQsoAt: sql<Date | null>`max(${qso.qsoAt})`,
		})
		.from(qso)
		.innerJoin(user, eq(user.id, qso.userId))
		.where(and(...scope))
		.groupBy(qso.userId) as unknown as Promise<AggregateRow[]>;
}

function activeDaysQuery(tx: Tx, userIds: string[], seasonId?: number) {
	const scope = [
		inArray(qso.userId, userIds),
		eq(user.banned, false),
		...(seasonId === undefined ? [] : [eq(qso.seasonId, seasonId)]),
	];

	return tx
		.selectDistinct({ userId: qso.userId, day: vilniusDay })
		.from(qso)
		.innerJoin(user, eq(user.id, qso.userId))
		.where(and(...scope));
}

function toStats(row: AggregateRow, days: string[]): AchievementStats {
	return {
		qsoCount: row.qsoCount,
		points: row.points,
		confirmedCount: row.confirmedCount,
		distinctCallsigns: row.distinctCallsigns,
		distinctSquares: row.distinctSquares,
		bands: row.bands ?? [],
		modes: row.modes ?? [],
		nightQsoCount: row.nightQsoCount,
		activeDays: days.length,
		longestStreak: longestStreak(days),
		firstQsoAt: row.firstQsoAt,
		lastQsoAt: row.lastQsoAt,
	};
}

async function buildStats(
	tx: Tx,
	userIds: string[],
	seasonId?: number
): Promise<Map<string, AchievementStats>> {
	const [rows, dayRows] = await Promise.all([
		aggregateQuery(tx, userIds, seasonId),
		activeDaysQuery(tx, userIds, seasonId),
	]);

	const daysByUser = new Map<string, string[]>();
	for (const row of dayRows) {
		const existing = daysByUser.get(row.userId);
		if (existing) {
			existing.push(row.day);
		} else {
			daysByUser.set(row.userId, [row.day]);
		}
	}

	return new Map(
		rows.map((row) => [
			row.userId,
			toStats(row, daysByUser.get(row.userId) ?? []),
		])
	);
}

async function writeStats(
	tx: Tx,
	userIds: string[],
	stats: Map<string, AchievementStats>,
	seasonId: number | null
) {
	const scope =
		seasonId === null
			? isNull(userStat.seasonId)
			: eq(userStat.seasonId, seasonId);

	const stale = userIds.filter((userId) => !stats.has(userId));
	if (stale.length > 0) {
		await tx
			.delete(userStat)
			.where(and(inArray(userStat.userId, stale), scope));
	}

	if (stats.size === 0) {
		return;
	}

	await tx
		.insert(userStat)
		.values([...stats].map(([userId, row]) => ({ userId, seasonId, ...row })))
		.onConflictDoUpdate({
			target: [userStat.userId, userStat.seasonId],
			set: {
				qsoCount: sql`excluded.qso_count`,
				points: sql`excluded.points`,
				confirmedCount: sql`excluded.confirmed_count`,
				distinctCallsigns: sql`excluded.distinct_callsigns`,
				distinctSquares: sql`excluded.distinct_squares`,
				bands: sql`excluded.bands`,
				modes: sql`excluded.modes`,
				nightQsoCount: sql`excluded.night_qso_count`,
				activeDays: sql`excluded.active_days`,
				longestStreak: sql`excluded.longest_streak`,
				firstQsoAt: sql`excluded.first_qso_at`,
				lastQsoAt: sql`excluded.last_qso_at`,
			},
		});
}

/**
 * Every user whose stats a season-wide reconciliation must touch: anyone with a
 * QSO in the season, plus anyone holding a stat row that may now be stale.
 */
async function seasonUserIds(tx: Tx, seasonId: number): Promise<string[]> {
	const [qsoUsers, statUsers] = await Promise.all([
		tx
			.selectDistinct({ userId: qso.userId })
			.from(qso)
			.where(eq(qso.seasonId, seasonId)),
		tx
			.selectDistinct({ userId: userStat.userId })
			.from(userStat)
			.where(eq(userStat.seasonId, seasonId)),
	]);

	return [
		...new Set([
			...qsoUsers.map((row) => row.userId),
			...statUsers.map((row) => row.userId),
		]),
	];
}

/**
 * Reconciles materialized stats from the source-of-truth `qso` table. Called
 * from the same chokepoint as `syncQsoScores`, inside the same transaction, so
 * stats can never diverge from scores. Returns the affected user ids for the
 * achievement pass.
 *
 * `userIds` narrows the pass to the operators a write actually touched — the
 * ordinary path, since rebuilding season *and* career aggregates for every
 * operator in the season on every logged QSO does not scale. Omit it only for a
 * deliberate season-wide reconciliation (recompute, backfill).
 */
export async function syncUserStats(
	tx: Tx,
	seasonId: number,
	userIds?: string[]
): Promise<{
	affectedUserIds: string[];
	seasonStats: Map<string, AchievementStats>;
	careerStats: Map<string, AchievementStats>;
}> {
	const affectedUserIds =
		userIds === undefined
			? await seasonUserIds(tx, seasonId)
			: [...new Set(userIds)];

	if (affectedUserIds.length === 0) {
		return {
			affectedUserIds,
			seasonStats: new Map(),
			careerStats: new Map(),
		};
	}

	const [seasonStats, careerStats] = await Promise.all([
		buildStats(tx, affectedUserIds, seasonId),
		buildStats(tx, affectedUserIds),
	]);

	await writeStats(tx, affectedUserIds, seasonStats, seasonId);
	await writeStats(tx, affectedUserIds, careerStats, null);

	return { affectedUserIds, seasonStats, careerStats };
}

export function statsOrEmpty(
	stats: Map<string, AchievementStats>,
	userId: string
): AchievementStats {
	return stats.get(userId) ?? EMPTY_STATS;
}
