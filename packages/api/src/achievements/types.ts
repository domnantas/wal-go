import type { createDb } from "@WAL-GO/db";

type Db = Awaited<ReturnType<typeof createDb>>;

/**
 * Materialized counters for one scope (a single season, or the whole career).
 * Every ordinary achievement is a pure function of this object, so evaluating
 * the full catalogue costs zero queries.
 */
export interface AchievementStats {
	activeDays: number;
	bands: string[];
	confirmedCount: number;
	distinctCallsigns: number;
	distinctSquares: number;
	firstQsoAt: Date | null;
	lastQsoAt: Date | null;
	longestStreak: number;
	modes: string[];
	nightQsoCount: number;
	points: number;
	qsoCount: number;
}

export const EMPTY_STATS: AchievementStats = {
	qsoCount: 0,
	points: 0,
	confirmedCount: 0,
	distinctCallsigns: 0,
	distinctSquares: 0,
	bands: [],
	modes: [],
	nightQsoCount: 0,
	activeDays: 0,
	longestStreak: 0,
	firstQsoAt: null,
	lastQsoAt: null,
};

export interface AchievementContext {
	/** Counters across every season the user has played. */
	career: AchievementStats;
	db: Db;
	/**
	 * Escape hatch for achievements no counter can express. Only called while
	 * the achievement is still locked, so an unlocked one costs nothing forever
	 * after. Each loader's query runs once per evaluation run for the whole
	 * batch of users.
	 */
	extra: ExtraLoaders;
	/** Counters for the season being evaluated. */
	season: AchievementStats;
	seasonId: number;
	userId: string;
}

/**
 * Lazily loaded, memoized data for achievements that need more than counters.
 * Add a loader here rather than widening the stats row when the requirement is
 * one-off and unlikely to be reused.
 */
export interface ExtraLoaders {
	/** Most confirmed QSOs in a single Vilnius day, this season. */
	bestConfirmedDay(): Promise<number>;
	/** Most QSOs in a single Vilnius day, this season. */
	bestQsoDay(): Promise<number>;
	/** QSOs logged on February 16 (Vilnius) in any year, career-wide. */
	february16QsoCount(): Promise<number>;
	/** Memberships in seasons using the alpha or beta rule set. */
	testSeasonCount(): Promise<number>;
	/** Teams of the operators this user has worked, career-wide. */
	workedTeams(): Promise<ReadonlySet<string>>;
}

export type AchievementScope = "season" | "career";

export interface AchievementDefinition {
	description: string;
	/** Groups tiers of the same idea; used to collapse the UI to the top tier. */
	group: string;
	/** lucide-react icon name, resolved on the client. */
	icon: string;
	id: string;
	label: string;
	/**
	 * Current progress toward `target`. Synchronous by default; return a promise
	 * only when the achievement genuinely needs `context.extra`.
	 */
	progress(context: AchievementContext): number | Promise<number>;
	scope: AchievementScope;
	target: number;
	tier: number;
}
