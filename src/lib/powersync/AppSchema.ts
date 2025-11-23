import { DrizzleAppSchema } from "@powersync/drizzle-driver";
import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const qsos = sqliteTable("qsos", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  receivedCallsign: text("received_callsign"),
  receivedWAL: text("received_wal"),
  sentWAL: text("sent_wal"),
  receivedRST: text("received_rst"),
  sentRST: text("sent_rst"),
  frequency: text("frequency"),
  mode: text("mode"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

export const drizzleAppSchema = {
  qsos,
};

export const AppSchema = new DrizzleAppSchema(drizzleAppSchema);

export type Database = (typeof AppSchema)["types"];
export type QSORecord = Database["qsos"];
