ALTER TABLE "qsos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "received_callsign" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "received_rst" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "sent_rst" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "frequency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "qsos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
CREATE POLICY "Authenticated can insert/select/update/delete own QSOs" ON "qsos" AS PERMISSIVE FOR ALL TO "authenticated" USING (((select auth.uid()) is not null and (select auth.uid()) = "qsos"."user_id"));