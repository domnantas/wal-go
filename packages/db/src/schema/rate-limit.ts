import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";

import { generateNanoId } from "../lib/ids";

export const rateLimit = pgTable("rate_limit", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => generateNanoId()),
	key: text("key").notNull().unique(),
	count: integer("count").notNull(),
	lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
