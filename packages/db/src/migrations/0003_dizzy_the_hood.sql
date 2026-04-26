ALTER TABLE "season" DROP CONSTRAINT IF EXISTS "season_public_id_unique";--> statement-breakpoint
ALTER TABLE "season" DROP COLUMN IF EXISTS "public_id";
