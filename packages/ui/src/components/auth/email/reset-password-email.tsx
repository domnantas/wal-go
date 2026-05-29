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

import { cn } from "../../../lib/utils";
import {
	type EmailClassNames,
	type EmailColors,
	EmailStyles,
} from "./email-styles";

const resetPasswordEmailLocalization = {
	RESET_YOUR_PASSWORD: "Reset your password",
	LOGO: "Logo",
	CLICK_BUTTON_TO_RESET_PASSWORD:
		"Click the button below to reset the password for your {appName} account.",
	RESET_PASSWORD: "Reset password",
	OR_COPY_AND_PASTE_URL: "Or copy and paste this URL into your browser:",
	THIS_LINK_EXPIRES_IN_MINUTES:
		"This link expires in {expirationMinutes} minutes.",
	EMAIL_SENT_BY: "Email sent by {appName}.",
	IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
		"If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
	POWERED_BY_BETTER_AUTH: "Powered by {betterAuth}",
};

export type ResetPasswordEmailLocalization =
	typeof resetPasswordEmailLocalization;

export interface ResetPasswordEmailProps {
	appName?: string;
	classNames?: EmailClassNames;
	colors?: EmailColors;
	darkMode?: boolean;
	expirationMinutes?: number;
	head?: ReactNode;
	localization?: Partial<ResetPasswordEmailLocalization>;
	logoURL?: string | { light: string; dark: string };
	poweredBy?: boolean;
	url: string;
}

export const ResetPasswordEmail = ({
	url,
	appName,
	expirationMinutes = 60,
	logoURL,
	colors,
	classNames,
	darkMode = true,
	poweredBy,
	head,
	...props
}: ResetPasswordEmailProps) => {
	const localization = {
		...ResetPasswordEmail.localization,
		...props.localization,
	};

	const previewText = localization.RESET_YOUR_PASSWORD;

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
								{localization.RESET_YOUR_PASSWORD}
							</Heading>

							<Text className={cn("font-normal text-sm", classNames?.content)}>
								{localization.CLICK_BUTTON_TO_RESET_PASSWORD.replace(
									"{appName}",
									appName || ""
								)
									.replace(/\s{2,}/g, " ")
									.replace(" .", ".")}
							</Text>

							<Section className="my-6">
								<Button
									className={cn(
										"inline-block whitespace-nowrap rounded-none bg-primary px-6 py-2.5 font-medium text-primary-foreground text-sm no-underline",
										classNames?.button
									)}
									href={url}
								>
									{localization.RESET_PASSWORD}
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

ResetPasswordEmail.localization = resetPasswordEmailLocalization;

ResetPasswordEmail.PreviewProps = {
	url: "https://better-auth-ui.com/auth/reset-password?token=example-token",
	appName: "Better Auth",
	darkMode: true,
} as ResetPasswordEmailProps;

export default ResetPasswordEmail;
