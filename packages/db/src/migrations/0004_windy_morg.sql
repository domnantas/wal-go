CREATE TABLE "qso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"season_id" integer NOT NULL,
	"contact_callsign" varchar(32) NOT NULL,
	"band" varchar(16) NOT NULL,
	"mode" varchar(16) NOT NULL,
	"qso_at" timestamp (6) with time zone NOT NULL,
	"operator_square" varchar(3) NOT NULL,
	"contact_square" varchar(3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qso" ADD CONSTRAINT "qso_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qso" ADD CONSTRAINT "qso_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qso_user_season_qso_at_idx" ON "qso" USING btree ("user_id","season_id","qso_at");--> statement-breakpoint
CREATE INDEX "qso_season_idx" ON "qso" USING btree ("season_id");