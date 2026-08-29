CREATE TABLE "user_achievement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_achievement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"achievement_id" varchar(64) NOT NULL,
	"season_id" integer,
	"progress" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"unlocked_at" timestamp(6) with time zone,
	CONSTRAINT "user_achievement_user_achievement_season_uq" UNIQUE NULLS NOT DISTINCT("user_id","achievement_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "user_stat" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_stat_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"season_id" integer,
	"qso_count" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"confirmed_count" integer DEFAULT 0 NOT NULL,
	"distinct_callsigns" integer DEFAULT 0 NOT NULL,
	"distinct_squares" integer DEFAULT 0 NOT NULL,
	"bands" text[] DEFAULT '{}'::text[] NOT NULL,
	"modes" text[] DEFAULT '{}'::text[] NOT NULL,
	"night_qso_count" integer DEFAULT 0 NOT NULL,
	"active_days" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"first_qso_at" timestamp(6) with time zone,
	"last_qso_at" timestamp(6) with time zone,
	CONSTRAINT "user_stat_user_season_uq" UNIQUE NULLS NOT DISTINCT("user_id","season_id")
);
--> statement-breakpoint
CREATE INDEX "user_achievement_user_idx" ON "user_achievement" ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievement_unlocked_idx" ON "user_achievement" ("unlocked_at");--> statement-breakpoint
CREATE INDEX "user_stat_season_idx" ON "user_stat" ("season_id");--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_stat" ADD CONSTRAINT "user_stat_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_stat" ADD CONSTRAINT "user_stat_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;