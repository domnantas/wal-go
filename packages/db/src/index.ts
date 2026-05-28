import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./schema/relations.ts";

interface ConnectionResolution {
	connectionString: string;
	source: "explicit" | "database-url" | "hyperdrive";
}

function isConfigured(value: string | undefined): value is string {
	return value !== undefined && value.length > 0;
}

async function getCloudflareEnv(): Promise<CloudflareEnv | undefined> {
	try {
		const mod = "cloudflare:workers";
		/* @vite-ignore */
		const { env } = (await import(mod)) as { env: CloudflareEnv };
		return env;
	} catch {
		// cloudflare:workers not available outside Worker runtime
		return;
	}
}

async function resolveConnectionString(
	explicit?: string
): Promise<ConnectionResolution | undefined> {
	if (explicit) {
		return { connectionString: explicit, source: "explicit" };
	}

	const cloudflareEnv = await getCloudflareEnv();
	if (isConfigured(cloudflareEnv?.DATABASE_URL)) {
		return {
			connectionString: cloudflareEnv.DATABASE_URL,
			source: "database-url",
		};
	}
	if (isConfigured(cloudflareEnv?.HYPERDRIVE?.connectionString)) {
		return {
			connectionString: cloudflareEnv.HYPERDRIVE.connectionString,
			source: "hyperdrive",
		};
	}
	if (isConfigured(process.env.DATABASE_URL)) {
		return {
			connectionString: process.env.DATABASE_URL,
			source: "database-url",
		};
	}
	return;
}

export async function createDb(connectionString?: string) {
	const resolved = await resolveConnectionString(connectionString);
	if (!resolved) {
		throw new Error(
			"[db] No database connection string configured. Set DATABASE_URL or bind HYPERDRIVE."
		);
	}
	const pool = new Pool({
		connectionString: resolved.connectionString,
		maxUses: 1,
	});
	pool.on("error", (err) => {
		console.error(`[db] ${resolved.source} pool error:`, err);
	});
	return drizzle({ client: pool, relations });
}
