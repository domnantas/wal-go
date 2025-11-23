CREATE TABLE "qsos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"received_callsign" text,
	"received_wal" text,
	"sent_wal" text,
	"received_rst" text,
	"sent_rst" text,
	"frequency" text,
	"mode" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;