CREATE TABLE "newsletter_subscription" (
	"user_id" text PRIMARY KEY,
	"subscribed" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscription" ADD CONSTRAINT "newsletter_subscription_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Backfill: opt every existing user into the newsletter.
-- New users get their row from the sign-up hook.
INSERT INTO "newsletter_subscription" ("user_id")
SELECT "id" FROM "user"
ON CONFLICT DO NOTHING;
