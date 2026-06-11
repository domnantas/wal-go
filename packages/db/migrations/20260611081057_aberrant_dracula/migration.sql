CREATE TABLE "app_config" (
	"id" integer PRIMARY KEY,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
