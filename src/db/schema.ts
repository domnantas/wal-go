import { and, eq, isNotNull } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const qsos = pgTable(
  "qsos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
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
  ]
);
