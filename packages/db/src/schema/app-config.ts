import { boolean, integer, pgTable, timestamp } from "drizzle-orm/pg-core";

// Single-row table holding global runtime settings. The row is keyed by a fixed
// id (APP_CONFIG_ID) so reads/writes always target the same singleton.
export const APP_CONFIG_ID = 1;

export const appConfig = pgTable("app_config", {
	id: integer("id").primaryKey(),
	maintenanceMode: boolean("maintenance_mode").notNull().default(false),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
