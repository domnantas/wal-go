import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./schema/relations.ts";

async function resolveConnectionString(
	explicit?: string
): Promise<string | undefined> {
	if (explicit) {
		return explicit;
	}
	try {
		const mod = "cloudflare:workers";
		/* @vite-ignore */
		const { env } = (await import(mod)) as { env: CloudflareEnv };
		if (env?.HYPERDRIVE?.connectionString) {
			return env.HYPERDRIVE.connectionString;
		}
	} catch {
		// cloudflare:workers not available outside Worker runtime
	}
	return process.env.DATABASE_URL;
}

export async function createDb(connectionString?: string) {
	const resolved = await resolveConnectionString(connectionString);
	const pool = new Pool({ connectionString: resolved, maxUses: 1 });
	pool.on("error", (err) => {
		console.error("[db] pool error:", err);
	});
	return drizzle({ client: pool, relations });
}
