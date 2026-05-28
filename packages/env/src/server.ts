/// <reference path="../env.d.ts" />

// Lazy getters so that process.env is read at access time (inside request
// handlers), not at module initialization. CF Workers may not populate
// process.env from bindings until the first fetch handler runs.
export const env = {
	get CORS_ORIGIN() {
		return process.env.CORS_ORIGIN ?? "";
	},
	get BETTER_AUTH_SECRET() {
		return process.env.BETTER_AUTH_SECRET ?? "";
	},
	get BETTER_AUTH_URL() {
		return process.env.BETTER_AUTH_URL ?? "";
	},
	get DATABASE_URL() {
		return process.env.DATABASE_URL;
	},
} as const;

export async function getCloudflareEnv(): Promise<CloudflareEnv | undefined> {
	try {
		const moduleName = "cloudflare:workers";
		/* @vite-ignore */
		const { env: cloudflareEnv } = (await import(moduleName)) as {
			env: CloudflareEnv;
		};
		return cloudflareEnv;
	} catch {
		return;
	}
}

export async function getHyperdriveConnectionString(): Promise<
	string | undefined
> {
	const cloudflareEnv = await getCloudflareEnv();
	return cloudflareEnv?.HYPERDRIVE?.connectionString;
}
