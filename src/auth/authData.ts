import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { z } from "zod";

export const authDataSchema = z.object({
	sub: z.string().nullable(),
	iss: z.string(),
	aud: z.string(),
	iat: z.number(),
	exp: z.number(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
});

export type AuthData = z.infer<typeof authDataSchema>;

export async function validateAndDecodeAuthData(token: string) {
	try {
		const JWKS = createRemoteJWKSet(
			new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
		);
		const { payload } = await jwtVerify(token, JWKS, {
			issuer: process.env.BETTER_AUTH_URL,
			audience: process.env.BETTER_AUTH_URL,
		});
		return authDataSchema.parse(payload);
	} catch (error) {
		console.error("Token validation failed:", error);
		throw error;
	}
}

export function decodeAuthData(jwt?: string): AuthData | undefined {
	if (!jwt) {
		return undefined;
	}
	return authDataSchema.parse(decodeJwt(jwt));
}
