import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { season, teamColor } from "./seasons";

export const QSO_MODES = ["CW", "SSB", "FM", "DIGI"] as const;
export const QSO_BANDS = [
	"160m",
	"80m",
	"60m",
	"40m",
	"30m",
	"20m",
	"17m",
	"15m",
	"12m",
	"10m",
	"6m",
	"4m",
	"2m",
	"70cm",
	"24cm",
	"13cm",
	"9cm",
	"6cm",
	"3cm",
	"12mm",
	"6mm",
	"4mm",
	"2.5mm",
	"2mm",
	"1mm",
] as const;

export const mode = pgEnum("mode", QSO_MODES);
export const band = pgEnum("band", QSO_BANDS);

export const qso = pgTable(
	"qso",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		seasonId: integer("season_id")
			.notNull()
			.references(() => season.id, { onDelete: "cascade" }),
		contactCallsign: varchar("contact_callsign", { length: 32 }).notNull(),
		band: band("band").notNull(),
		mode: mode("mode").notNull(),
		qsoAt: timestamp("qso_at", {
			precision: 6,
			withTimezone: true,
		}).notNull(),
		team: teamColor("team").notNull(),
		operatorSquare: varchar("operator_square", { length: 3 }).notNull(),
		contactSquare: varchar("contact_square", { length: 3 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		unique("qso_exact_duplicate_uq")
			.on(
				table.userId,
				table.seasonId,
				table.contactCallsign,
				table.band,
				table.mode,
				table.qsoAt,
				table.operatorSquare,
				table.contactSquare
			)
			.nullsNotDistinct(),
		index("qso_user_season_qso_at_idx").on(
			table.userId,
			table.seasonId,
			table.qsoAt
		),
		index("qso_season_idx").on(table.seasonId),
	]
);

export const qsoRelations = relations(qso, ({ one }) => ({
	user: one(user, {
		fields: [qso.userId],
		references: [user.id],
	}),
	season: one(season, {
		fields: [qso.seasonId],
		references: [season.id],
	}),
}));
