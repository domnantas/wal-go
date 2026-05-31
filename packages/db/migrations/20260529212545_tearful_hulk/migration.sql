CREATE TABLE IF NOT EXISTS "cabrillo_upload" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"season_id" integer NOT NULL REFERENCES "season"("id") ON DELETE CASCADE,
	"callsign" varchar(32) NOT NULL,
	"accepted" integer NOT NULL,
	"skipped" integer NOT NULL,
	"uploaded_at" timestamptz(6) NOT NULL DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "cabrillo_content" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "imported_lines" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "skipped_lines" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "cabrillo_content" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "imported_lines" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "skipped_lines" DROP DEFAULT;
