ALTER TABLE "qso" ADD COLUMN IF NOT EXISTS "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "qso" ADD COLUMN IF NOT EXISTS "confirmed" boolean DEFAULT false NOT NULL;