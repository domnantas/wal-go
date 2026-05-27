import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// biome-ignore lint/performance/noNamespaceImport: It's ok for schema imports
import * as schema from "./schema";

export function createDb(connectionString?: string) {
	const pool = new Pool({
		connectionString: connectionString ?? process.env.DATABASE_URL,
		maxUses: 1,
	});

	return drizzle({ client: pool, schema });
}
