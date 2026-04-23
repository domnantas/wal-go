import { AuthProvider } from "@WAL-GO/ui/components/auth/auth-provider";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTheme } from "tanstack-theme-kit";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();

	return (
		<AuthProvider
			appearance={{ setTheme, theme }}
			authClient={authClient}
			emailAndPassword={{
				requireEmailVerification: true,
			}}
			Link={Link}
			localization={{
				auth: {
					account: "Paskyra",
					addAccount: "Pridėti paskyrą",
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
					magicLink: "Magiška nuoroda",
					magicLinkSent: "Magiška nuoroda išsiųsta į jūsų el. paštą",
					signIn: "Prisijungti",
					signOut: "Atsijungti",
					signUp: "Registruotis",
					name: "Šaukinys",
					namePlaceholder: "LY1AB",
					needToCreateAnAccount: "Neturite paskyros?",
					newPassword: "Naujas slaptažodis",
					newPasswordPlaceholder: "Įveskite naują slaptažodį",
					or: "ARBA",
					passkey: "Prieigos raktas",
					password: "Slaptažodis",
					passwordPlaceholder: "Įveskite slaptažodį",
					passwordResetEmailSent: "Slaptažodžio atkūrimo laiškas išsiųstas",
					passwordResetSuccess: "Slaptažodis sėkmingai pakeistas",
					passwordsDoNotMatch: "Slaptažodžiai nesutampa",
					rememberMe: "Prisiminti mane",
					rememberYourPassword: "Prisiminėte slaptažodį?",
					resend: "Siųsti dar kartą",
					resetPassword: "Atkurti slaptažodį",
					sendMagicLink: "Siųsti magišką nuorodą",
					sendResetLink: "Siųsti atkūrimo nuorodą",
					showPassword: "Rodyti slaptažodį",
					switchAccount: "Perjungti paskyrą",
					username: "Naudotojo vardas",
					usernameAvailable: "Naudotojo vardas laisvas",
					usernameOrEmailPlaceholder: "Įveskite naudotojo vardą arba el. paštą",
					usernamePlaceholder: "Įveskite naudotojo vardą",
					usernameTaken: "Šis naudotojo vardas jau užimtas. Bandykite kitą.",
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
					avatarChangedSuccess: "Avataras sėkmingai pakeistas",
					avatarDeletedSuccess: "Avataras sėkmingai ištrintas",
					changeAvatar: "Keisti avatarą",
					deleteAvatar: "Ištrinti avatarą",
					link: "Susieti",
					linkedAccounts: "Susietos paskyros",
					linkProvider: "Susieti jūsų {{provider}} paskyrą",
					appearance: "Išvaizda",
					cancel: "Atšaukti",
					changeEmail: "Keisti el. paštą",
					changeEmailSuccess:
						"Patvirtinkite el. pašto adreso pakeitimą savo el. pašte",
					changePassword: "Keisti slaptažodį",
					changePasswordSuccess: "Slaptažodis sėkmingai pakeistas",
					currentPassword: "Dabartinis slaptažodis",
					currentPasswordPlaceholder: "Įveskite dabartinį slaptažodį",
					dark: "Tamsi",
					dangerZone: "Pavojinga zona",
					deleteUser: "Ištrinti naudotoją",
					deleteUserDescription:
						"Visam laikui pašalinti jūsų paskyrą ir visus susijusius duomenis. Šio veiksmo atšaukti negalima.",
					deleteUserVerificationSent:
						"Patvirtinkite paskyros ištrynimą savo el. pašte.",
					deleteUserSuccess: "Jūsų paskyra ištrinta.",
					light: "Šviesi",
					manageAccounts: "Tvarkyti paskyras",
					addPasskey: "Pridėti prieigos raktą",
					delete: "Ištrinti",
					passkeys: "Prieigos raktai",
					passkeysDescription:
						"Tvarkykite savo prieigos raktus saugiam prisijungimui.",
					passkeysInstructions:
						"Saugiai pasiekite savo paskyrą be slaptažodžio.",
					profile: "Profilis",
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
					system: "Sistemos",
					theme: "Tema",
					unlinkProvider: "Atsieti {{provider}}",
					updateEmail: "Atnaujinti el. paštą",
					updatePassword: "Atnaujinti slaptažodį",
					uploadAvatar: "Įkelti avatarą",
				},
			}}
			navigate={navigate}
			queryClient={queryClient}
			redirectTo="/"
		>
			{children}
		</AuthProvider>
	);
}
