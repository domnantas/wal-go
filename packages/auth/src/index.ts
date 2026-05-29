import { createDb } from "@WAL-GO/db";
// biome-ignore lint/performance/noNamespaceImport: It's ok for schema imports
import * as schema from "@WAL-GO/db/schema/auth";
import { env } from "@WAL-GO/env/server";
import { EmailVerificationEmail } from "@WAL-GO/ui/components/auth/email/email-verification";
import { ResetPasswordEmail } from "@WAL-GO/ui/components/auth/email/reset-password-email";
import { i18n } from "@better-auth/i18n";
import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { createElement } from "react";
import { Resend } from "resend";

const CALLSIGN_REGEX = /^LY\d{1,4}[A-Z]{1,5}$/;

export async function createAuth() {
	const db = await createDb();
	const resend = new Resend(env.RESEND_API_KEY);

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				const html = await render(
					createElement(ResetPasswordEmail, {
						url,
						appName: "WAL GO (https://walgo.lt)",
						poweredBy: false,
						logoURL: {
							light: "https://walgo.lt/logo.png",
							dark: "https://walgo.lt/logo.png",
						},
						expirationMinutes: 60,
						localization: {
							RESET_YOUR_PASSWORD: "Atkurkite slaptažodį",
							LOGO: "Logotipas",
							CLICK_BUTTON_TO_RESET_PASSWORD:
								"Paspauskite žemiau esantį mygtuką, kad atkurtumėte {appName} paskyros slaptažodį.",
							RESET_PASSWORD: "Atkurti slaptažodį",
							OR_COPY_AND_PASTE_URL:
								"Arba nukopijuokite šią nuorodą į naršyklę:",
							THIS_LINK_EXPIRES_IN_MINUTES:
								"Nuoroda galioja {expirationMinutes} min.",
							EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
							IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
								"Jei neprašėte atkurti slaptažodžio, ignoruokite šį laišką. Jūsų slaptažodis nebus pakeistas.",
						},
					})
				);
				await resend.emails.send({
					from: "WAL GO <noreply@walgo.lt>",
					to: user.email,
					subject: "Atkurkite slaptažodį – WAL GO",
					html,
				});
			},
			customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
				...coreFields,
				// Admin plugin fields (in schema order)
				role: "user", // or your configured defaultRole
				banned: false,
				banReason: null,
				banExpires: null,
				...additionalFields,
				id,
			}),
		},
		emailVerification: {
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				const html = await render(
					createElement(EmailVerificationEmail, {
						url,
						email: user.email,
						appName: "WAL GO (https://walgo.lt)",
						poweredBy: false,
						logoUrl: {
							light: "https://walgo.lt/logo.png",
							dark: "https://walgo.lt/logo.png",
						},
						expirationMinutes: 60,
						localization: {
							VERIFY_YOUR_EMAIL_ADDRESS: "Patvirtinkite el. paštą",
							LOGO: "Logotipas",
							CLICK_BUTTON_TO_VERIFY_EMAIL:
								"Paspauskite žemiau esantį mygtuką, kad patvirtintumėte el. pašto adresą {emailAddress}.",
							VERIFY_EMAIL_ADDRESS: "Patvirtinti el. paštą",
							OR_COPY_AND_PASTE_URL:
								"Arba nukopijuokite šią nuorodą į naršyklę:",
							THIS_LINK_EXPIRES_IN_MINUTES:
								"Nuoroda galioja {expirationMinutes} min.",
							EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
							IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
								"Jei nesiregistravote WAL GO, ignoruokite šį laišką.",
						},
					})
				);
				await resend.emails.send({
					from: "WAL GO <noreply@walgo.lt>",
					to: user.email,
					subject: "Patvirtinkite el. paštą – WAL GO",
					html,
				});
			},
			sendOnSignUp: true,
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
