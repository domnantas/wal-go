import { AuthProvider } from "@WAL-GO/ui/components/auth/auth-provider";
import { themePlugin, usernamePlugin } from "@better-auth-ui/core/plugins";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTheme } from "tanstack-theme-kit";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();

	return (
		<AuthProvider
			authClient={authClient}
			emailAndPassword={{
				requireEmailVerification: true,
			}}
			localization={{
				auth: {
					account: "Paskyra",
					alreadyHaveAnAccount: "Jau turite paskyrą?",
					confirmPassword: "Patvirtinkite slaptažodį",
					confirmPasswordPlaceholder: "Pakartokite slaptažodį",
					continueWith: "Tęsti su {{provider}}",
					email: "El. paštas",
					emailPlaceholder: "Įveskite el. paštą",
					forgotPassword: "Pamiršote slaptažodį",
					forgotPasswordLink: "Pamiršote slaptažodį?",
					hidePassword: "Slėpti slaptažodį",
					invalidResetPasswordToken: "Netinkamas slaptažodžio atkūrimo raktas",
					signIn: "Prisijungti",
					signOut: "Atsijungti",
					signUp: "Registruotis",
					name: "Šaukinys",
					namePlaceholder: "LY1AB",
					needToCreateAnAccount: "Neturite paskyros?",
					newPassword: "Naujas slaptažodis",
					newPasswordPlaceholder: "Įveskite naują slaptažodį",
					or: "ARBA",
					password: "Slaptažodis",
					passwordPlaceholder: "Įveskite slaptažodį",
					passwordResetEmailSent: "Slaptažodžio atkūrimo laiškas išsiųstas",
					passwordResetSuccess: "Slaptažodis sėkmingai pakeistas",
					passwordsDoNotMatch: "Slaptažodžiai nesutampa",
					rememberMe: "Prisiminti mane",
					rememberYourPassword: "Prisiminėte slaptažodį?",
					resend: "Siųsti dar kartą",
					resetPassword: "Atkurti slaptažodį",
					sendResetLink: "Siųsti atkūrimo nuorodą",
					showPassword: "Rodyti slaptažodį",
					verificationEmailSent: "Patvirtinimo laiškas išsiųstas!",
					verifyYourEmail: "Patvirtinkite savo el. paštą",
				},
				settings: {
					account: "Paskyra",
					accountUnlinked: "Paskyra atsieta",
					active: "Aktyvi",
					activeSessions: "Aktyvios sesijos",
					avatar: "Avataras",
					currentSession: "Dabartinė sesija",
					link: "Susieti",
					linkedAccounts: "Susietos paskyros",
					linkProvider: "Susieti jūsų {{provider}} paskyrą",
					cancel: "Atšaukti",
					changeEmail: "Keisti el. paštą",
					changeEmailSuccess:
						"Patvirtinkite el. pašto adreso pakeitimą savo el. pašte",
					changePassword: "Keisti slaptažodį",
					changePasswordSuccess: "Slaptažodis sėkmingai pakeistas",
					currentPassword: "Dabartinis slaptažodis",
					currentPasswordPlaceholder: "Įveskite dabartinį slaptažodį",
					dangerZone: "Pavojinga zona",
					delete: "Ištrinti",
					userProfile: "Profilis",
					profileUpdatedSuccess: "Profilis sėkmingai atnaujintas",
					revoke: "Atšaukti",
					revokeSession: "Nutraukti sesiją",
					revokeSessionSuccess: "Sesija sėkmingai nutraukta",
					saveChanges: "Išsaugoti pakeitimus",
					setPassword: "Nustatyti slaptažodį",
					setPasswordDescription:
						"Dar neturite slaptažodžio. Paprašykite atkūrimo nuorodos, kad galėtumėte jį nustatyti.",
					security: "Saugumas",
					settings: "Nustatymai",
					unlinkProvider: "Atsieti {{provider}}",
					updateEmail: "Pakeisti el. paštą",
					updatePassword: "Pakeisti slaptažodį",
				},
			}}
			navigate={navigate}
			plugins={[
				themePlugin({
					setTheme,
					theme,
					localization: {
						appearance: "Išvaizda",
						dark: "Tamsi",
						light: "Šviesi",
						system: "Sistemos",
						theme: "Tema",
					},
				}),
				usernamePlugin({
					localization: {
						username: "Šaukinys",
						usernamePlaceholder: "Įveskite šaukinį",
						usernameOrEmailPlaceholder: "Įveskite šaukinį arba el. paštą",
						usernameAvailable: "Šaukinys laisvas",
						usernameTaken: "Šis šaukinys jau užimtas. Bandykite kitą.",
						displayUsername: "Rodomas šaukinys",
						displayUsernamePlaceholder: "Įveskite rodomą šaukinį",
					},
				}),
			]}
			queryClient={queryClient}
			redirectTo="/map"
		>
			{children}
		</AuthProvider>
	);
}
