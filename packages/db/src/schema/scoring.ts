import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { season, teamColor } from "./seasons";

export const squareScore = pgTable(
	"square_score",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		seasonId: integer("season_id")
			.notNull()
			.references(() => season.id, { onDelete: "cascade" }),
		squareCode: varchar("square_code", { length: 3 }).notNull(),
		team: teamColor("team").notNull(),
		points: integer("points").notNull().default(0),
	},
	(table) => [
		uniqueIndex("square_score_season_square_team_uq").on(
			table.seasonId,
			table.squareCode,
			table.team
		),
		index("square_score_season_idx").on(table.seasonId),
		check("square_score_points_non_negative", sql`${table.points} >= 0`),
	]
);

export const userSeasonScore = pgTable(
	"user_season_score",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		seasonId: integer("season_id")
			.notNull()
			.references(() => season.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		points: integer("points").notNull().default(0),
	},
	(table) => [
		uniqueIndex("user_season_score_season_user_uq").on(
			table.seasonId,
			table.userId
		),
		check("user_season_score_points_non_negative", sql`${table.points} >= 0`),
	]
);

export const squareScoreRelations = relations(squareScore, ({ one }) => ({
	season: one(season, {
		fields: [squareScore.seasonId],
		references: [season.id],
	}),
}));

export const userSeasonScoreRelations = relations(
	userSeasonScore,
	({ one }) => ({
		season: one(season, {
			fields: [userSeasonScore.seasonId],
			references: [season.id],
		}),
		user: one(user, {
			fields: [userSeasonScore.userId],
			references: [user.id],
		}),
	})
);
