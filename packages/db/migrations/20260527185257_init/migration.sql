CREATE TYPE "band" AS ENUM('160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '4m', '2m', '70cm', '24cm', '13cm', '9cm', '6cm', '3cm', '12mm', '6mm', '4mm', '2.5mm', '2mm', '1mm');--> statement-breakpoint
CREATE TYPE "mode" AS ENUM('CW', 'SSB', 'FM', 'DIGI');--> statement-breakpoint
CREATE TYPE "team_color" AS ENUM('yellow', 'green', 'red');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp(6) with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"season_id" integer NOT NULL,
	"contact_callsign" varchar(32) NOT NULL,
	"band" "band" NOT NULL,
	"mode" "mode" NOT NULL,
	"qso_at" timestamp(6) with time zone NOT NULL,
	"team" "team_color" NOT NULL,
	"operator_square" varchar(3) NOT NULL,
	"contact_square" varchar(3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qso_exact_duplicate_uq" UNIQUE NULLS NOT DISTINCT("user_id","season_id","contact_callsign","band","mode","qso_at","operator_square","contact_square")
);
--> statement-breakpoint
CREATE TABLE "square_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "square_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"square_code" varchar(3) NOT NULL,
	"team" "team_color" NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "square_score_points_non_negative" CHECK ("points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_season_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_season_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_season_score_points_non_negative" CHECK ("points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "season" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "season_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"starts_at" timestamp(6) with time zone NOT NULL,
	"ends_at" timestamp(6) with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "season_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"team" "team_color" NOT NULL,
	"joined_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "qso_user_season_qso_at_idx" ON "qso" ("user_id","season_id","qso_at");--> statement-breakpoint
CREATE INDEX "qso_season_idx" ON "qso" ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "square_score_season_square_team_uq" ON "square_score" ("season_id","square_code","team");--> statement-breakpoint
CREATE INDEX "square_score_season_idx" ON "square_score" ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_season_score_season_user_uq" ON "user_season_score" ("season_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "season_membership_user_season_uq" ON "season_membership" ("user_id","season_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "qso" ADD CONSTRAINT "qso_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "qso" ADD CONSTRAINT "qso_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "square_score" ADD CONSTRAINT "square_score_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_season_score" ADD CONSTRAINT "user_season_score_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_season_score" ADD CONSTRAINT "user_season_score_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "season_membership" ADD CONSTRAINT "season_membership_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "season_membership" ADD CONSTRAINT "season_membership_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;