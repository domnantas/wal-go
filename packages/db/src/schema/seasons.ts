import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const teamColor = pgEnum("team_color", ["yellow", "green", "red"]);

export const season = pgTable("season", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	name: varchar("name", { length: 120 }).notNull(),
	startsAt: timestamp("starts_at", {
		precision: 6,
		withTimezone: true,
	}).notNull(),
	endsAt: timestamp("ends_at", {
		precision: 6,
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const seasonMembership = pgTable(
	"season_membership",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		seasonId: integer("season_id")
			.notNull()
			.references(() => season.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		team: teamColor("team").notNull(),
		joinedAt: timestamp("joined_at", {
			precision: 6,
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("season_membership_user_season_uq").on(
			table.userId,
			table.seasonId
		),
	]
);
