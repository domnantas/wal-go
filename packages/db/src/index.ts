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
	// Temporary diagnostic: confirm whether deployed Workers route through
	// Hyperdrive. `worker` = running inside a Worker; `hd` = HYPERDRIVE binding
	// present; `hdConn` = binding has a usable connection string. If a Worker
	// shows hd=false or hdConn=false it falls through to a direct DATABASE_URL
	// connection (visible in PlanetScale as application_name=postgres.js). Never
	// log the connection string — it contains the DB password. Remove once the
	// Hyperdrive binding is verified.
	console.error(
		`[db] worker=${cloudflareEnv !== undefined} hd=${cloudflareEnv?.HYPERDRIVE !== undefined} hdConn=${isConfigured(cloudflareEnv?.HYPERDRIVE?.connectionString)}`
	);
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
// client per request with max: 1 (see getDb).
const NODE_POOL_MAX = 10;
const CLOSE_TIMEOUT_SECONDS = 5;

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
	});
	return { db: drizzle({ client, relations }), client };
}

export async function createDb(connectionString?: string) {
	const { db } = await createClient(connectionString, 1);
	return db;
}

/**
 * A database handle plus a `dispose` to release it when the request ends.
 * On Workers `dispose` closes the per-request client; on Node it is a noop
 * because the pool is shared across requests.
 */
export interface DbScope {
	db: Awaited<ReturnType<typeof createDb>>;
	dispose: () => Promise<void>;
}

const noopDispose = () => Promise.resolve();

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
 * Workers: a fresh client per call. Reusing one socket across requests on
 * Workers throws "Cannot perform I/O on behalf of a different request", so the
 * client is never cached; Hyperdrive pools the real DB connections, so closing
 * this node-local client in `dispose` is cheap.
 *
 * Node/local: a single shared pool (max NODE_POOL_MAX) reused across requests —
 * this is the connection pooling that prevents "too many clients already".
 * `dispose` is a noop here: closing the shared pool per request would re-create
 * the leak this exists to fix.
 */
export async function getDb(): Promise<DbScope> {
	const onWorkers = (await getCloudflareEnv()) !== undefined;

	if (onWorkers) {
		const { db, client } = await createClient(undefined, 1);
		return {
			db,
			dispose: () => client.end({ timeout: CLOSE_TIMEOUT_SECONDS }),
		};
	}

	const globalWithPool = globalThis as NodePoolGlobal;
	globalWithPool[NODE_POOL_KEY] ??= createClient(undefined, NODE_POOL_MAX);
	const { db } = await globalWithPool[NODE_POOL_KEY];
	return { db, dispose: noopDispose };
}
