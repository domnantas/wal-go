import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";

export const rateLimit = pgTable("rate_limit", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	key: text("key").notNull().unique(),
	count: integer("count").notNull(),
	lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
