export {};

declare global {
	interface CloudflareEnv {
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL?: string;
		CORS_ORIGIN?: string;
		DATABASE_URL?: string;
		DISCORD_WEBHOOK_URL?: string;
		HYPERDRIVE?: { connectionString: string };
		RESEND_API_KEY: string;
	}

	type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
	export const env: CloudflareEnv;

	// biome-ignore lint/style/noNamespace: It's ok for Cloudflare
	namespace Cloudflare {
		export interface Env extends CloudflareEnv {}
	}
}
