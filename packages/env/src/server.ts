/// <reference path="../env.d.ts" />
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const importMetaEnv =
	(import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const runtimeEnv = { ...importMetaEnv, ...process.env };

export const env = createEnv({
	server: {
		CORS_ORIGIN: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(1),
		BETTER_AUTH_URL: z.string().url(),
		DATABASE_URL: z.string().optional(),
	},
	runtimeEnv,
	emptyStringAsUndefined: true,
});

export async function getCloudflareEnv(): Promise<CloudflareEnv | undefined> {
	try {
		const moduleName = "cloudflare:workers";
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
