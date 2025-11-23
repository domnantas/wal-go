import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

export const qsos = pgTable("qsos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  receivedCallsign: text("received_callsign"),
  receivedWAL: text("received_wal"),
  sentWAL: text("sent_wal"),
  receivedRST: text("received_rst"),
  sentRST: text("sent_rst"),
  frequency: text("frequency"),
  mode: text("mode"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
