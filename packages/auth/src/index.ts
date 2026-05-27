import { createDb } from "@WAL-GO/db";
// biome-ignore lint/performance/noNamespaceImport: It's ok for schema imports
import * as schema from "@WAL-GO/db/schema/auth";
import { env } from "@WAL-GO/env/server";
import { i18n } from "@better-auth/i18n";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

const CALLSIGN_REGEX = /^LY\d{1,4}[A-Z]{1,5}$/;

export function createAuth(connectionString?: string) {
	const db = createDb(connectionString);

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [
			tanstackStartCookies(),
			admin(),
			i18n({
				defaultLocale: "lt",
				translations: {
					lt: {
						USER_NOT_FOUND: "Naudotojas nerastas",
						FAILED_TO_CREATE_USER: "Nepavyko sukurti naudotojo",
						FAILED_TO_CREATE_SESSION: "Nepavyko sukurti sesijos",
						FAILED_TO_UPDATE_USER: "Nepavyko atnaujinti naudotojo",
						FAILED_TO_GET_SESSION: "Nepavyko gauti sesijos",
						INVALID_PASSWORD: "Neteisingas slaptažodis",
						INVALID_EMAIL: "Neteisingas el. paštas",
						INVALID_EMAIL_OR_PASSWORD:
							"Neteisingas el. paštas arba slaptažodis",
						INVALID_USER: "Neteisingas naudotojas",
						SOCIAL_ACCOUNT_ALREADY_LINKED: "Socialinė paskyra jau susieta",
						PROVIDER_NOT_FOUND: "Tiekėjas nerastas",
						INVALID_TOKEN: "Neteisingas raktas",
						TOKEN_EXPIRED: "Rakto galiojimas baigėsi",
						FAILED_TO_GET_USER_INFO: "Nepavyko gauti naudotojo informacijos",
						USER_EMAIL_NOT_FOUND: "Naudotojo el. paštas nerastas",
						EMAIL_NOT_VERIFIED: "El. paštas nepatvirtintas",
						PASSWORD_TOO_SHORT: "Slaptažodis per trumpas",
						PASSWORD_TOO_LONG: "Slaptažodis per ilgas",
						USER_ALREADY_EXISTS: "Naudotojas jau egzistuoja",
						USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
							"El. paštas jau užregistruotas. Naudokite kitą el. paštą.",
						EMAIL_CAN_NOT_BE_UPDATED: "El. pašto atnaujinti negalima",
						CREDENTIAL_ACCOUNT_NOT_FOUND: "Prisijungimo paskyra nerasta",
						SESSION_EXPIRED:
							"Sesijos galiojimas baigėsi. Prisijunkite iš naujo, kad atliktumėte šį veiksmą.",
						FAILED_TO_UNLINK_LAST_ACCOUNT:
							"Negalite atsieti paskutinės paskyros",
						ACCOUNT_NOT_FOUND: "Paskyra nerasta",
						USER_ALREADY_HAS_PASSWORD:
							"Naudotojas jau turi slaptažodį. Norėdami ištrinti paskyrą, pateikite jį.",
						VERIFICATION_EMAIL_NOT_ENABLED:
							"El. pašto patvirtinimas neįjungtas",
						EMAIL_ALREADY_VERIFIED: "El. paštas jau patvirtintas",
						EMAIL_MISMATCH: "El. paštai nesutampa",
						SESSION_NOT_FRESH: "Sesija nebėra šviežia",
						LINKED_ACCOUNT_ALREADY_EXISTS: "Susieta paskyra jau egzistuoja",
						VALIDATION_ERROR: "Validacijos klaida",
						MISSING_FIELD: "Laukas yra privalomas",
						PASSWORD_ALREADY_SET: "Naudotojas jau turi nustatytą slaptažodį",
					},
				},
			}),
		],
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
