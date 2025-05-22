import { db } from "@/db";
import * as schema from "@/db/schema";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: ["walgo://"],
  plugins: [
    expo(),
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
