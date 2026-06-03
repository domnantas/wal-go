import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { season } from "./seasons.ts";

export const UPLOAD_FORMATS = ["cabrillo", "adif"] as const;
export const uploadFormat = pgEnum("upload_format", UPLOAD_FORMATS);

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
	format: uploadFormat("format").notNull().default("cabrillo"),
	accepted: integer("accepted").notNull(),
	skipped: integer("skipped").notNull(),
	// Holds the raw log content for either format (column name kept for
	// migration stability).
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
