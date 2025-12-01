import { and, eq, isNotNull, sql } from "drizzle-orm";
import {
  check,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  () => [
    pgPolicy("Authenticated can select seasons", {
      for: "select",
      to: authenticatedRole,
      using: isNotNull(authUid),
    }),
  ]
);

export const seasonParticipants = pgTable(
  "season_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    team: text("team").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("user_season_unique").on(table.userId, table.seasonId),
    check("team_valid", sql`${table.team} IN ('yellow', 'green', 'red')`),
    pgPolicy("Authenticated can select all participants", {
      for: "select",
      to: authenticatedRole,
      using: isNotNull(authUid),
    }),
    pgPolicy("Authenticated can insert own participation", {
      for: "insert",
      to: authenticatedRole,
      withCheck: and(isNotNull(authUid), eq(authUid, table.userId)),
    }),
  ]
);

export const qsos = pgTable(
  "qsos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    receivedCallsign: text("received_callsign").notNull(),
    receivedWAL: text("received_wal"),
    sentWAL: text("sent_wal"),
    receivedRST: text("received_rst").notNull(),
    sentRST: text("sent_rst").notNull(),
    frequency: text("frequency").notNull(),
    mode: text("mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("Authenticated can insert/select/update/delete own QSOs", {
      for: "all",
      to: authenticatedRole,
      using: and(isNotNull(authUid), eq(authUid, table.userId)),
    }),
    check(
      "callsign_format",
      sql`length(${table.receivedCallsign}) >= 3 AND length(${table.receivedCallsign}) <= 10`
    ),
    check(
      "received_wal_format",
      sql`${table.receivedWAL} IS NULL OR ${table.receivedWAL} = '' OR ${table.receivedWAL} ~ '^[A-P][0-9]{2}$'`
    ),
    check(
      "sent_wal_format",
      sql`${table.sentWAL} IS NULL OR ${table.sentWAL} = '' OR ${table.sentWAL} ~ '^[A-P][0-9]{2}$'`
    ),
    check(
      "received_rst_format",
      sql`${table.receivedRST} ~ '^[1-5][1-9][1-9]?$'`
    ),
    check(
      "sent_rst_format",
      sql`${table.sentRST} ~ '^[1-5][1-9][1-9]?$'`
    ),
    check(
      "mode_valid",
      sql`${table.mode} IN ('SSB', 'CW', 'DIGI')`
    ),
  ]
);
