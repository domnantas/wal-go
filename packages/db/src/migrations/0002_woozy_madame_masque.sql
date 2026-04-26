CREATE TYPE "public"."team_color" AS ENUM('yellow', 'green', 'red');--> statement-breakpoint
CREATE TABLE "season" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "season_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" varchar(12) NOT NULL,
	"name" varchar(120) NOT NULL,
	"starts_at" timestamp (6) with time zone NOT NULL,
	"ends_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "season_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "season_membership" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "season_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"team" "team_color" NOT NULL,
	"joined_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "season_membership" ADD CONSTRAINT "season_membership_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_membership" ADD CONSTRAINT "season_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "season_membership_user_season_uq" ON "season_membership" USING btree ("user_id","season_id");