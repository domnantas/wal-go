import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	pixelBasedPreset,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import {
	BRAND,
	type EmailClassNames,
	type EmailColors,
	EmailStyles,
	WARM_SURFACE,
} from "./email-styles";
import { cn } from "./lib/utils";

const emailVerificationEmailLocalization = {
	VERIFY_YOUR_EMAIL_ADDRESS: "Patvirtinkite savo el. pašto adresą",
	LOGO: "Logotipas",
	CLICK_BUTTON_TO_VERIFY_EMAIL:
		"Paspauskite žemiau esantį mygtuką, kad patvirtintumėte savo el. pašto adresą {emailAddress} {appName} paskyrai.",
	VERIFY_EMAIL_ADDRESS: "Patvirtinkite el. pašto adresą",
	OR_COPY_AND_PASTE_URL:
		"Arba nukopijuokite ir įklijuokite šią nuorodą į naršyklę:",
	THIS_LINK_EXPIRES_IN_MINUTES: "Ši nuoroda galioja {expirationMinutes} min.",
	EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
	IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
		"Jei šio laiško neprašėte, galite jį tiesiog ignoruoti. Kažkas galėjo per klaidą įvesti jūsų el. pašto adresą.",
	POWERED_BY_BETTER_AUTH: "Sukurta su {betterAuth}",
};

/**
 * Localization strings for the EmailVerificationEmail component.
 *
 * Contains all text content used in the email verification email template.
 */
export type EmailVerificationEmailLocalization =
	typeof emailVerificationEmailLocalization;

/**
 * Props for the EmailVerificationEmail component.
 */
export interface EmailVerificationEmailProps {
	/** Name of the application sending the email */
	appName?: string;
	/** Custom CSS class names for styling specific parts of the email */
	classNames?: EmailClassNames;
	/** Custom color scheme for light and dark modes */
	colors?: EmailColors;
	/** Whether to enable dark mode support */
	darkMode?: boolean;
	/** Email address being verified */
	email?: string;
	/** Number of minutes until the verification link expires */
	expirationMinutes?: number;
	/** Additional React nodes to inject into the email head */
	head?: ReactNode;
	/**
	 * Localization overrides for customizing email text
	 * @remarks `EmailVerificationEmailLocalization`
	 */
	localization?: Partial<EmailVerificationEmailLocalization>;
	/** Logo URL(s) - a single string or light/dark variants. If omitted, no logo is shown. */
	logoURL?: string | { light: string; dark: string };
	/** Whether to show the "Powered by better-auth" footer */
	poweredBy?: boolean;
	/** Verification URL that users must click to verify their email */
	url: string;
}

/**
 * Email template component that sends email verification links to users.
 *
 * This email includes:
 * - Verification button and fallback URL
 * - Expiration time information
 * - Security notice for unauthorized requests
 * - Customizable branding and styling
 * - Support for light/dark mode themes
 *
 * @example
 * ```tsx
 * <EmailVerificationEmail
 *   url="https://example.com/verify?token=abc123"
 *   email="user@example.com"
 *   appName="My App"
 *   expirationMinutes={60}
 *   logoURL="https://example.com/logo.png"
 *   darkMode={true}
 * />
 * ```
 */
export const EmailVerificationEmail = ({
	url,
	email,
	appName,
	expirationMinutes = 60,
	logoURL,
	colors = WARM_SURFACE,
	classNames,
	darkMode = true,
	poweredBy,
	head,
	...props
}: EmailVerificationEmailProps) => {
	const localization = {
		...EmailVerificationEmail.localization,
		...props.localization,
	};

	const previewText = localization.VERIFY_YOUR_EMAIL_ADDRESS;

	return (
		<Html>
			<Head>
				<meta content="light dark" name="color-scheme" />
				<meta content="light dark" name="supported-color-schemes" />

				<EmailStyles colors={colors} darkMode={darkMode} />

				{head}
			</Head>

			<Preview>{previewText}</Preview>

			<Tailwind config={{ presets: [pixelBasedPreset] }}>
				<Body className={cn("bg-background font-sans", classNames?.body)}>
					<Container
						className={cn(
							"mx-auto my-auto max-w-xl px-2 py-10",
							classNames?.container
						)}
					>
						<Section
							className={cn(
								"overflow-hidden rounded-lg border border-border bg-card text-card-foreground",
								classNames?.card
							)}
						>
							<Section className="px-8 pt-8 pb-6 text-center">
								{logoURL &&
									(typeof logoURL === "string" ? (
										<Img
											alt={appName || localization.LOGO}
											className={cn("mx-auto mb-6", classNames?.logo)}
											height={128}
											src={logoURL}
											width={128}
										/>
									) : (
										<>
											<Img
												alt={appName || localization.LOGO}
												className={cn(
													"logo-light mx-auto mb-6",
													classNames?.logo
												)}
												height={128}
												src={logoURL.light}
												width={128}
											/>
											<Img
												alt={appName || localization.LOGO}
												className={cn(
													"logo-dark mx-auto mb-6 hidden",
													classNames?.logo
												)}
												height={128}
												src={logoURL.dark}
												width={128}
											/>
										</>
									))}

								<Heading
									className={cn(
										"m-0 text-center font-bold text-3xl",
										classNames?.title
									)}
								>
									{localization.VERIFY_EMAIL_ADDRESS}
								</Heading>
							</Section>

							<Section className="px-8 pb-8">
								<Text
									className={cn(
										"mt-0 mb-2 font-normal text-base leading-7",
										classNames?.content
									)}
								>
									{(() => {
										const textWithAppName =
											localization.CLICK_BUTTON_TO_VERIFY_EMAIL.replace(
												"{appName}",
												appName || ""
											)
												.replace(/\s{2,}/g, " ")
												.replace(" .", ".");

										const [beforeEmailAddress, afterEmailAddress] =
											textWithAppName.split("{emailAddress}");

										return email ? (
											<>
												{beforeEmailAddress}

												<Link
													className="font-semibold underline"
													href={`mailto:${email}`}
													style={{ color: BRAND.rust }}
												>
													{email}
												</Link>

												{afterEmailAddress}
											</>
										) : (
											textWithAppName
												.replace("{emailAddress}", "")
												.replace(/\s{2,}/g, " ")
												.replace(" .", ".")
										);
									})()}
								</Text>

								<Section className="mt-8 mb-2 text-center">
									<Button
										className={cn(
											"box-border inline-block whitespace-nowrap rounded-md px-8 py-3 font-bold text-base no-underline",
											classNames?.button
										)}
										href={url}
										style={{
											backgroundColor: BRAND.brown,
											color: BRAND.white,
										}}
									>
										{localization.VERIFY_EMAIL_ADDRESS}
									</Button>
								</Section>

								<Hr
									className={cn(
										"my-6 w-full border border-border border-solid",
										classNames?.separator
									)}
								/>

								<Text
									className={cn(
										"mb-3 text-muted-foreground text-xs",
										classNames?.description
									)}
								>
									{localization.OR_COPY_AND_PASTE_URL}
								</Text>

								<Link
									className={cn("break-all text-xs", classNames?.link)}
									href={url}
									style={{ color: BRAND.rust }}
								>
									{url}
								</Link>

								{expirationMinutes && (
									<Text
										className={cn(
											"mt-6 mb-0 text-muted-foreground text-xs",
											classNames?.description
										)}
									>
										{localization.THIS_LINK_EXPIRES_IN_MINUTES.replace(
											"{expirationMinutes}",
											expirationMinutes.toString()
										)}
									</Text>
								)}

								<Text
									className={cn(
										"mt-3 mb-0 text-muted-foreground text-xs",
										classNames?.description
									)}
								>
									{localization.IF_YOU_DIDNT_REQUEST_THIS_EMAIL}
								</Text>
							</Section>
						</Section>

						<Section className="px-8 pt-6 text-center">
							{appName && (
								<Text className="m-0 text-muted-foreground text-xs">
									{localization.EMAIL_SENT_BY.replace("{appName}", appName)}
								</Text>
							)}

							{poweredBy && (
								<Text
									className={cn(
										"mt-2 mb-0 text-[11px] text-muted-foreground",
										classNames?.poweredBy
									)}
								>
									{(() => {
										const [beforeBetterAuth, afterBetterAuth] =
											localization.POWERED_BY_BETTER_AUTH.split("{betterAuth}");

										return (
											<>
												{beforeBetterAuth}
												<Link
													className={cn("underline", classNames?.link)}
													href="https://better-auth.com"
													style={{ color: BRAND.rust }}
												>
													better-auth
												</Link>
												{afterBetterAuth}
											</>
										);
									})()}
								</Text>
							)}
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

/**
 * Default localization strings for the email verification template.
 * Can be overridden via the `localization` prop.
 */
EmailVerificationEmail.localization = emailVerificationEmailLocalization;

/**
 * Example props for previewing the email template in development.
 */
EmailVerificationEmail.PreviewProps = {
	url: "https://better-auth-ui.com/auth/verify-email?token=example-token",
	appName: "Better Auth",
	email: "m@example.com",
	darkMode: true,
} as EmailVerificationEmailProps;

export default EmailVerificationEmail;
