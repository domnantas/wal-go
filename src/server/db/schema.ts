import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const teamEnum = pgEnum("team", ["yellow", "green", "red"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").unique(),
    callsign: text("callsign").notNull().unique(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_callsign_idx").on(t.callsign)],
);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const seasonParticipants = pgTable(
  "season_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    team: teamEnum("team").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("season_participants_season_user_uq").on(t.seasonId, t.userId)],
);

export const qsoUploads = pgTable("qso_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  rawBytes: text("raw_bytes").notNull(),
  qsoCount: integer("qso_count").notNull().default(0),
  acceptedCount: integer("accepted_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const qsos = pgTable(
  "qsos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploadId: uuid("upload_id").references(() => qsoUploads.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    team: teamEnum("team").notNull(),
    workedCall: text("worked_call").notNull(),
    band: text("band"),
    mode: text("mode"),
    qsoDate: date("qso_date").notNull(),
    timeOn: text("time_on"),
    freq: text("freq"),
    myWal: text("my_wal"),
    workedWal: text("worked_wal"),
    myAwarded: boolean("my_awarded").notNull().default(false),
    workedAwarded: boolean("worked_awarded").notNull().default(false),
    rawRecord: jsonb("raw_record").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("qsos_user_season_idx").on(t.userId, t.seasonId),
    index("qsos_season_my_wal_idx").on(t.seasonId, t.myWal),
    index("qsos_season_worked_wal_idx").on(t.seasonId, t.workedWal),
  ],
);

export const pointAwards = pgTable(
  "point_awards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qsoId: uuid("qso_id")
      .notNull()
      .references(() => qsos.id, { onDelete: "cascade" }),
    team: teamEnum("team").notNull(),
    walSquare: text("wal_square").notNull(),
    workedCall: text("worked_call").notNull(),
    band: text("band").notNull().default(""),
    mode: text("mode").notNull().default(""),
    qsoDate: date("qso_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("point_awards_dedup_uq").on(
      t.seasonId,
      t.userId,
      t.workedCall,
      t.band,
      t.mode,
      t.qsoDate,
      t.walSquare,
    ),
    index("point_awards_season_square_team_idx").on(
      t.seasonId,
      t.walSquare,
      t.team,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type SeasonParticipant = typeof seasonParticipants.$inferSelect;
export type QsoUpload = typeof qsoUploads.$inferSelect;
export type Qso = typeof qsos.$inferSelect;
export type NewQso = typeof qsos.$inferInsert;
export type PointAward = typeof pointAwards.$inferSelect;
export type NewPointAward = typeof pointAwards.$inferInsert;
export type Team = (typeof teamEnum.enumValues)[number];
