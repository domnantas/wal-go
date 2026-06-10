export {};

declare global {
	interface CloudflareEnv {
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL?: string;
		CORS_ORIGIN?: string;
		DATABASE_URL?: string;
		DISCORD_WEBHOOK_URL?: string;
		// Cloudflare Email Sending `send_email` binding (see infra alchemy.run.ts).
		// Typed with the builder-form `send` we use; the runtime binding also
		// accepts a raw `EmailMessage`.
		EMAIL?: {
			send(message: {
				from: string;
				to: string;
				subject: string;
				html?: string;
				text?: string;
				headers?: Record<string, string>;
			}): Promise<unknown>;
		};
		HYPERDRIVE?: { connectionString: string };
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
