CREATE TABLE "square_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "square_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"square_code" varchar(3) NOT NULL,
	"team" "team_color" NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "square_score_points_non_negative" CHECK ("square_score"."points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_season_score" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_season_score_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_season_score_points_non_negative" CHECK ("user_season_score"."points" >= 0)
);
--> statement-breakpoint
ALTER TABLE "qso" ADD COLUMN "team" "team_color" NOT NULL;--> statement-breakpoint
ALTER TABLE "square_score" ADD CONSTRAINT "square_score_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_season_score" ADD CONSTRAINT "user_season_score_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_season_score" ADD CONSTRAINT "user_season_score_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "square_score_season_square_team_uq" ON "square_score" USING btree ("season_id","square_code","team");--> statement-breakpoint
CREATE INDEX "square_score_season_idx" ON "square_score" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_season_score_season_user_uq" ON "user_season_score" USING btree ("season_id","user_id");