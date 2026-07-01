export {};

declare global {
	interface CloudflareEnv {
		// Public R2 bucket for newsletter images (see infra alchemy.run.ts).
		// Typed with just the `put` we use; the runtime binding is a full R2Bucket.
		ASSETS_BUCKET?: {
			put(
				key: string,
				value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
				options?: { httpMetadata?: { contentType?: string } }
			): Promise<unknown>;
		};
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL?: string;
		CORS_ORIGIN?: string;
		DATABASE_URL?: string;
		// Discord linked-role team assignment (see docs/discord-roles.md). Both
		// optional: the feature silently disables when unset.
		DISCORD_CLIENT_ID?: string;
		DISCORD_CLIENT_SECRET?: string;
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
