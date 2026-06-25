import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
	if (isConfigured(cloudflareEnv?.HYPERDRIVE?.connectionString)) {
		return {
			connectionString: cloudflareEnv.HYPERDRIVE.connectionString,
			source: "hyperdrive",
		};
	}
	if (isConfigured(cloudflareEnv?.DATABASE_URL)) {
		return {
			connectionString: cloudflareEnv.DATABASE_URL,
			source: "database-url",
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

// Node keeps one long-lived shared pool of this size; Workers open a fresh
// client per request with max: 1 (Hyperdrive pools the real DB connections).
const NODE_POOL_MAX = 10;

async function createClient(connectionString: string | undefined, max: number) {
	const resolved = await resolveConnectionString(connectionString);
	if (!resolved) {
		throw new Error(
			"[db] No database connection string configured. Set DATABASE_URL or bind HYPERDRIVE."
		);
	}
	const client = postgres(resolved.connectionString, {
		max,
		idle_timeout: 20,
		prepare: false,
		connection: { idle_session_timeout: 300_000 },
	});
	return drizzle({ client, relations });
}

export function createDb(connectionString?: string) {
	return createClient(connectionString, 1);
}

// Cache the shared Node pool's in-flight promise per process. Stored on
// globalThis so Vite HMR module re-evaluation in dev reuses it instead of
// leaking a fresh pool. The promise (not the awaited value) is cached so
// concurrent first-hits share one pool instead of each building its own.
const NODE_POOL_KEY = "__walGoNodePool";

type NodePoolGlobal = typeof globalThis & {
	[NODE_POOL_KEY]?: ReturnType<typeof createClient>;
};

/**
 * Resolve a database handle for the current request.
 *
 * Workers: fresh client per call — reusing one socket across requests throws
 * "Cannot perform I/O on behalf of a different request". Hyperdrive owns the
 * real DB connection lifecycle, so we never call client.end().
 *
 * Node/local: single shared pool (max NODE_POOL_MAX) reused across requests —
 * prevents "too many clients already".
 */
export async function getDb() {
	const onWorkers = (await getCloudflareEnv()) !== undefined;

	if (onWorkers) {
		return createClient(undefined, 1);
	}

	const globalWithPool = globalThis as NodePoolGlobal;
	globalWithPool[NODE_POOL_KEY] ??= createClient(undefined, NODE_POOL_MAX);
	return globalWithPool[NODE_POOL_KEY];
}
