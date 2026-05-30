import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { season } from "./seasons.ts";

export interface UploadAcceptedLine {
	content: string;
	line: number;
}

export interface UploadSkippedLine {
	content: string;
	line: number;
	reason: string;
}

export const cabrilloUpload = pgTable("cabrillo_upload", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	seasonId: integer("season_id")
		.notNull()
		.references(() => season.id, { onDelete: "cascade" }),
	callsign: varchar("callsign", { length: 32 }).notNull(),
	accepted: integer("accepted").notNull(),
	skipped: integer("skipped").notNull(),
	cabrilloContent: text("cabrillo_content").notNull(),
	importedLines: jsonb("imported_lines")
		.$type<UploadAcceptedLine[]>()
		.notNull(),
	skippedLines: jsonb("skipped_lines").$type<UploadSkippedLine[]>().notNull(),
	uploadedAt: timestamp("uploaded_at", {
		precision: 6,
		withTimezone: true,
	})
		.defaultNow()
		.notNull(),
});
