import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Better Auth schema

export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	email_verified: boolean().notNull(),
	image: text(),
	updated_at: timestamp().defaultNow(),
	created_at: timestamp().defaultNow(),
});

export const session = pgTable("session", {
	id: text().primaryKey(),
	expires_at: timestamp().notNull(),
	token: text().notNull().unique(),
	created_at: timestamp().notNull(),
	updated_at: timestamp().notNull(),
	ip_address: text(),
	user_agent: text(),
	user_id: text()
		.notNull()
		.references(() => user.id),
});

export const account = pgTable("account", {
	id: text().primaryKey(),
	account_id: text().notNull(),
	provider_id: text().notNull(),
	user_id: text()
		.notNull()
		.references(() => user.id),
	access_token: text(),
	refresh_token: text(),
	id_token: text(),
	access_token_expires_at: timestamp(),
	refresh_token_expires_at: timestamp(),
	scope: text(),
	password: text(),
	created_at: timestamp().notNull(),
	updated_at: timestamp().notNull(),
});

export const verification = pgTable("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expires_at: timestamp().notNull(),
	created_at: timestamp(),
	updated_at: timestamp(),
});

export const jwks = pgTable("jwks", {
	id: text().primaryKey(),
	public_key: text().notNull(),
	private_key: text().notNull(),
	created_at: timestamp().notNull(),
});

// WAL GO schema
export const qso = pgTable("qso", {
	id: text().primaryKey(),
	activator_callsign: text().notNull(),
	hunter_callsign: text().notNull(),
	activator_square: text().notNull(),
	hunter_square: text(),
	band: text().notNull(),
	mode: text().notNull(),
	rst_sent: text(),
	rst_received: text(),
	qso_at: timestamp().defaultNow(),
	updated_at: timestamp().defaultNow(),
	created_at: timestamp().defaultNow(),
});
