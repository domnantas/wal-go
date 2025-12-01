CREATE TABLE "season_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"team" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_season_unique" UNIQUE("user_id","season_id"),
	CONSTRAINT "team_valid" CHECK ("season_participants"."team" IN ('yellow', 'green', 'red'))
);
--> statement-breakpoint
ALTER TABLE "season_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qsos" ADD COLUMN "season_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "callsign_format" CHECK (length("qsos"."received_callsign") >= 3 AND length("qsos"."received_callsign") <= 10);--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "received_wal_format" CHECK ("qsos"."received_wal" IS NULL OR "qsos"."received_wal" = '' OR "qsos"."received_wal" ~ '^[A-P][0-9]{2}$');--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "sent_wal_format" CHECK ("qsos"."sent_wal" IS NULL OR "qsos"."sent_wal" = '' OR "qsos"."sent_wal" ~ '^[A-P][0-9]{2}$');--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "received_rst_format" CHECK ("qsos"."received_rst" ~ '^[1-5][1-9][1-9]?$');--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "sent_rst_format" CHECK ("qsos"."sent_rst" ~ '^[1-5][1-9][1-9]?$');--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "mode_valid" CHECK ("qsos"."mode" IN ('SSB', 'CW', 'DIGI'));--> statement-breakpoint
CREATE POLICY "Authenticated can select all participants" ON "season_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) is not null);--> statement-breakpoint
CREATE POLICY "Authenticated can insert own participation" ON "season_participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((select auth.uid()) is not null and (select auth.uid()) = "season_participants"."user_id"));--> statement-breakpoint
CREATE POLICY "Authenticated can select seasons" ON "seasons" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) is not null);