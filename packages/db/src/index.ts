import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./schema/relations.ts";

export function createDb(connectionString?: string) {
	const pool = new Pool({
		connectionString: connectionString ?? process.env.DATABASE_URL,
		maxUses: 1,
	});

	return drizzle({ client: pool, relations });
}
