ALTER TABLE "rate_limit" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "rate_limit" ALTER COLUMN "id" DROP IDENTITY;