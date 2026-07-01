ALTER TABLE "user" ADD COLUMN "discord_username" text;--> statement-breakpoint
CREATE UNIQUE INDEX "account_discord_accountId_uq" ON "account" ("account_id") WHERE "provider_id" = 'discord';