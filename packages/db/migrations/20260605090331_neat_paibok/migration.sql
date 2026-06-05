CREATE TABLE "square_control_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "square_control_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"season_id" integer NOT NULL,
	"square_code" varchar(3) NOT NULL,
	"before_team" "team_color",
	"after_team" "team_color",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "square_control_history_season_created_idx" ON "square_control_history" ("season_id","created_at");--> statement-breakpoint
ALTER TABLE "square_control_history" ADD CONSTRAINT "square_control_history_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;