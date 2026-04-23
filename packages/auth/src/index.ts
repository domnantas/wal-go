import { createDb } from "@WAL-GO/db";
// biome-ignore lint/performance/noNamespaceImport: It's ok for schema imports
import * as schema from "@WAL-GO/db/schema/auth";
import { env } from "@WAL-GO/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

const CALLSIGN_REGEX = /^LY\d{1,4}[A-Z]{1,5}$/;

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [tanstackStartCookies()],
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/update-user" && ctx.body?.name !== undefined) {
					ctx.body.name = undefined;
				}
				if (ctx.path === "/sign-up/email" && ctx.body?.name) {
					const callsign = String(ctx.body.name).toUpperCase();
					if (!CALLSIGN_REGEX.test(callsign)) {
						throw new APIError("BAD_REQUEST", {
							message: "Šaukinys turi atitikti LY formatą (pvz. LY1AB)",
						});
					}
					const existing = await db
						.select({ id: schema.user.id })
						.from(schema.user)
						.where(eq(schema.user.name, callsign))
						.limit(1);
					if (existing.length > 0) {
						throw new APIError("BAD_REQUEST", {
							message: "Šis šaukinys jau užregistruotas",
						});
					}
					ctx.body.name = callsign;
				}
			}),
		},
	});
}
