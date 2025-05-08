import { betterAuth } from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "~/db";
import * as schema from "~/db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),

	trustedOrigins: ["http://localhost"],

	plugins: [
		jwt({
			jwt: {
				expirationTime: "3y",
			},
			jwks: {
				keyPairConfig: { alg: "EdDSA", crv: "Ed25519" },
			},
		}),
		bearer(),
	],

	emailAndPassword: {
		enabled: true,
	},
});
