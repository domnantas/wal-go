import { DrizzleAppSchema } from "@powersync/drizzle-driver";
import { sql } from "drizzle-orm";
import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

export const seasonParticipants = sqliteTable(
  "season_participants",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    seasonId: text("season_id").notNull(),
    team: text("team").notNull(),
    joinedAt: text("joined_at").default(sql`(current_timestamp)`),
  },
  (table) => [
    check("team_valid", sql`${table.team} IN ('yellow', 'green', 'red')`),
  ]
);

export const qsos = sqliteTable(
  "qsos",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .default(sql`uuid()`),
    userId: text("user_id").notNull(),
    seasonId: text("season_id").notNull(),
    receivedCallsign: text("received_callsign").notNull(),
    receivedWAL: text("received_wal"),
    sentWAL: text("sent_wal"),
    receivedRST: text("received_rst").notNull(),
    sentRST: text("sent_rst").notNull(),
    frequency: text("frequency").notNull(),
    mode: text("mode").notNull(),
    createdAt: text("created_at").default(sql`(current_timestamp)`),
  },
  (table) => [
    check(
      "callsign_format",
      sql`length(${table.receivedCallsign}) >= 3 AND length(${table.receivedCallsign}) <= 10`
    ),
    check(
      "received_wal_format",
      sql`${table.receivedWAL} IS NULL OR ${table.receivedWAL} = '' OR ${table.receivedWAL} GLOB '[A-P][0-9][0-9]'`
    ),
    check(
      "sent_wal_format",
      sql`${table.sentWAL} IS NULL OR ${table.sentWAL} = '' OR ${table.sentWAL} GLOB '[A-P][0-9][0-9]'`
    ),
    check(
      "received_rst_format",
      sql`${table.receivedRST} GLOB '[1-5][1-9]' OR ${table.receivedRST} GLOB '[1-5][1-9][1-9]'`
    ),
    check(
      "sent_rst_format",
      sql`${table.sentRST} GLOB '[1-5][1-9]' OR ${table.sentRST} GLOB '[1-5][1-9][1-9]'`
    ),
    check(
      "mode_valid",
      sql`${table.mode} IN ('SSB', 'CW', 'DIGI')`
    ),
  ]
);

export const drizzleAppSchema = {
  seasons,
  seasonParticipants,
  qsos,
};

export const AppSchema = new DrizzleAppSchema(drizzleAppSchema);

export type Database = (typeof AppSchema)["types"];
export type SeasonRecord = Database["seasons"];
export type SeasonParticipantRecord = Database["season_participants"];
export type QSORecord = Database["qsos"];
