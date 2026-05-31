ALTER TABLE "rate_limit" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "rate_limit" DROP CONSTRAINT "rate_limit_pkey";--> statement-breakpoint
ALTER TABLE "rate_limit" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "rate_limit" ADD CONSTRAINT "rate_limit_key_key" UNIQUE("key");