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

const resetPasswordEmailLocalization = {
	RESET_YOUR_PASSWORD: "Atstatykite savo slaptažodį",
	LOGO: "Logotipas",
	CLICK_BUTTON_TO_RESET_PASSWORD:
		"Paspauskite žemiau esantį mygtuką, kad atstatytumėte savo {appName} paskyros slaptažodį.",
	RESET_PASSWORD: "Atstatyti slaptažodį",
	OR_COPY_AND_PASTE_URL:
		"Arba nukopijuokite ir įklijuokite šią nuorodą į naršyklę:",
	THIS_LINK_EXPIRES_IN_MINUTES: "Ši nuoroda galioja {expirationMinutes} min.",
	EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
	IF_YOU_DIDNT_REQUEST_THIS_EMAIL:
		"Jei slaptažodžio atstatymo neprašėte, galite šį laišką tiesiog ignoruoti. Jūsų slaptažodis nebus pakeistas.",
	POWERED_BY_BETTER_AUTH: "Sukurta su {betterAuth}",
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
	colors = WARM_SURFACE,
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
									{localization.RESET_YOUR_PASSWORD}
								</Heading>
							</Section>

							<Section className="px-8 pb-8">
								<Text
									className={cn(
										"mt-0 mb-2 font-normal text-base leading-7",
										classNames?.content
									)}
								>
									{localization.CLICK_BUTTON_TO_RESET_PASSWORD.replace(
										"{appName}",
										appName || ""
									)
										.replace(/\s{2,}/g, " ")
										.replace(" .", ".")}
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
										{localization.RESET_PASSWORD}
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

ResetPasswordEmail.localization = resetPasswordEmailLocalization;

ResetPasswordEmail.PreviewProps = {
	url: "https://better-auth-ui.com/auth/reset-password?token=example-token",
	appName: "Better Auth",
	darkMode: true,
} as ResetPasswordEmailProps;

export default ResetPasswordEmail;
