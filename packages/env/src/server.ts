/// <reference path="../env.d.ts" />

// Lazy getters so that process.env is read at access time (inside request
// handlers), not at module initialization. CF Workers may not populate
// process.env from bindings until the first fetch handler runs.
function required(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required env var: ${key}`);
	}
	return value;
}

export const env = {
	get CORS_ORIGIN() {
		return required("CORS_ORIGIN");
	},
	get BETTER_AUTH_SECRET() {
		return required("BETTER_AUTH_SECRET");
	},
	get BETTER_AUTH_URL() {
		return required("BETTER_AUTH_URL");
	},
	get DATABASE_URL() {
		return process.env.DATABASE_URL;
	},
	get RESEND_API_KEY() {
		return required("RESEND_API_KEY");
	},
	get DISCORD_WEBHOOK_URL() {
		return process.env.DISCORD_WEBHOOK_URL;
	},
} as const;
