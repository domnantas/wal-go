CREATE TYPE "upload_format" AS ENUM('cabrillo', 'adif');--> statement-breakpoint
ALTER TABLE "cabrillo_upload" ADD COLUMN "format" "upload_format" DEFAULT 'cabrillo'::"upload_format" NOT NULL;