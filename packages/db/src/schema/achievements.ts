import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { season } from "./seasons.ts";

// Materialized counters, so achievement evaluation is a pure function over one
// already-loaded row instead of a pile of queries. One row per user per season,
// plus a career row with a null seasonId — distinct counts cannot be summed
// across seasons, so the career totals are aggregated from qso, not from the
// season rows.
export const userStat = pgTable(
	"user_stat",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		seasonId: integer("season_id").references(() => season.id, {
			onDelete: "cascade",
		}),
		qsoCount: integer("qso_count").notNull().default(0),
		points: integer("points").notNull().default(0),
		confirmedCount: integer("confirmed_count").notNull().default(0),
		distinctCallsigns: integer("distinct_callsigns").notNull().default(0),
		distinctSquares: integer("distinct_squares").notNull().default(0),
		// Distinct bands and modes worked in this scope. Set membership without a
		// child table; the counts drive the coverage achievements.
		bands: text("bands").array().notNull().default([]),
		modes: text("modes").array().notNull().default([]),
		// QSOs logged between 00:00 and 05:00 Vilnius time.
		nightQsoCount: integer("night_qso_count").notNull().default(0),
		// Distinct Vilnius calendar days with at least one QSO.
		activeDays: integer("active_days").notNull().default(0),
		longestStreak: integer("longest_streak").notNull().default(0),
		firstQsoAt: timestamp("first_qso_at", {
			precision: 6,
			withTimezone: true,
		}),
		lastQsoAt: timestamp("last_qso_at", {
			precision: 6,
			withTimezone: true,
		}),
	},
	(table) => [
		// Career rows carry a null seasonId, so nulls must compare as equal.
		unique("user_stat_user_season_uq")
			.on(table.userId, table.seasonId)
			.nullsNotDistinct(),
		index("user_stat_season_idx").on(table.seasonId),
	]
);

// Unlocks and progress. Definitions live in code (packages/api/src/achievements);
// only outcomes are stored. seasonId is null for career-scoped achievements.
export const userAchievement = pgTable(
	"user_achievement",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		achievementId: varchar("achievement_id", { length: 64 }).notNull(),
		seasonId: integer("season_id").references(() => season.id, {
			onDelete: "cascade",
		}),
		progress: integer("progress").notNull().default(0),
		target: integer("target").notNull(),
		unlockedAt: timestamp("unlocked_at", {
			precision: 6,
			withTimezone: true,
		}),
	},
	(table) => [
		// Career rows have a null seasonId, so the unique index must treat nulls
		// as equal — otherwise one career achievement could unlock repeatedly.
		unique("user_achievement_user_achievement_season_uq")
			.on(table.userId, table.achievementId, table.seasonId)
			.nullsNotDistinct(),
		index("user_achievement_user_idx").on(table.userId),
		index("user_achievement_unlocked_idx").on(table.unlockedAt),
	]
);
