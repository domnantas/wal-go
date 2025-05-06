CREATE TABLE "qso" (
	"id" text PRIMARY KEY NOT NULL,
	"activator_callsign" text NOT NULL,
	"hunter_callsign" text NOT NULL,
	"activator_square" text NOT NULL,
	"hunter_square" text,
	"band" text NOT NULL,
	"mode" text NOT NULL,
	"rst_sent" text,
	"rst_received" text,
	"qso_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
