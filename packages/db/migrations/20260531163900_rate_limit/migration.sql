CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
