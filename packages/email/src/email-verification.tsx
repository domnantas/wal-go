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
	type EmailClassNames,
	type EmailColors,
	EmailStyles,
} from "./email-styles";
import { cn } from "./lib/utils";

const emailVerificationEmailLocalization = {
	VERIFY_YOUR_EMAIL_ADDRESS: "Verify your email address",
	LOGO: "Logo",
	CLICK_BUTTON_TO_VERIFY_EMAIL:
		"Click the button below to verify your email address {emailAddress} for your {appName} account.",
	VERIFY_EMAIL_ADDRESS: "Verify email address",
	OR_COPY_AND_PASTE_URL: "Or copy and paste this URL into your browser:",
	THIS_LINK_EXPIRES_IN_MINUTES:
		"This link expires in {expirationMinutes} minutes.",
	EMAIL_SENT_BY: "Email sent by {appName}.",
	IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
		"If you didn't request this email, you can safely ignore it. Someone else might have typed your email address by mistake.",
	POWERED_BY_BETTER_AUTH: "Powered by {betterAuth}",
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
	colors,
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
								"rounded-none border border-border bg-card p-8 text-card-foreground",
								classNames?.card
							)}
						>
							{logoURL &&
								(typeof logoURL === "string" ? (
									<Img
										alt={appName || localization.LOGO}
										className={cn("mx-auto mb-8", classNames?.logo)}
										height={48}
										src={logoURL}
										width={48}
									/>
								) : (
									<>
										<Img
											alt={appName || localization.LOGO}
											className={cn(
												"logo-light mx-auto mb-8",
												classNames?.logo
											)}
											height={48}
											src={logoURL.light}
											width={48}
										/>
										<Img
											alt={appName || localization.LOGO}
											className={cn(
												"logo-dark mx-auto mb-8 hidden",
												classNames?.logo
											)}
											height={48}
											src={logoURL.dark}
											width={48}
										/>
									</>
								))}

							<Heading
								className={cn(
									"m-0 mb-5 font-semibold text-2xl",
									classNames?.title
								)}
							>
								{localization.VERIFY_EMAIL_ADDRESS}
							</Heading>

							<Text className={cn("font-normal text-sm", classNames?.content)}>
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
												className="font-medium text-primary"
												href={`mailto:${email}`}
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

							<Section className="my-6">
								<Button
									className={cn(
										"inline-block whitespace-nowrap rounded-none bg-primary px-6 py-2.5 font-medium text-primary-foreground text-sm no-underline",
										classNames?.button
									)}
									href={url}
								>
									{localization.VERIFY_EMAIL_ADDRESS}
								</Button>
							</Section>

							<Text
								className={cn(
									"mb-3 text-muted-foreground text-xs",
									classNames?.description
								)}
							>
								{localization.OR_COPY_AND_PASTE_URL}
							</Text>

							<Link
								className={cn(
									"break-all text-primary text-xs",
									classNames?.link
								)}
								href={url}
							>
								{url}
							</Link>

							<Hr
								className={cn(
									"my-6 w-full border border-border border-solid",
									classNames?.separator
								)}
							/>

							{expirationMinutes || appName ? (
								<Text
									className={cn(
										"mb-3 text-muted-foreground text-xs",
										classNames?.description
									)}
								>
									{expirationMinutes
										? localization.THIS_LINK_EXPIRES_IN_MINUTES.replace(
												"{expirationMinutes}",
												expirationMinutes.toString()
											)
										: null}

									{appName && (
										<>
											{expirationMinutes ? " " : ""}
											{localization.EMAIL_SENT_BY.replace("{appName}", appName)}
										</>
									)}
								</Text>
							) : null}

							<Text
								className={cn(
									"mt-3 text-muted-foreground text-xs",
									classNames?.description
								)}
							>
								{localization.IF_YOU_DIDNT_REQUEST_THIS_EMAIL}
							</Text>

							{poweredBy && (
								<Text
									className={cn(
										"mt-4 mb-0 text-center text-[11px] text-muted-foreground",
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
													className={cn(
														"text-primary underline",
														classNames?.link
													)}
													href="https://better-auth.com"
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
