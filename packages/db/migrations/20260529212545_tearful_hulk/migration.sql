ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "cabrillo_content" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "imported_lines" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN IF NOT EXISTS "skipped_lines" jsonb NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "cabrillo_content" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "imported_lines" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ALTER COLUMN "skipped_lines" DROP DEFAULT;
