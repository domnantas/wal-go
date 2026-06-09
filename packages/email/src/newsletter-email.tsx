import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	pixelBasedPreset,
	Row,
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

// Email clients can't read the app's oklch design tokens, so the brand palette
// is pinned here as static sRGB hex. Values mirror `--brand-*` from
// packages/ui/src/styles/globals.css. They stay constant across light/dark
// because brand identity should look the same in every inbox.
const BRAND = {
	olive: "#41592c",
	rust: "#a8472d",
	golden: "#d7a23d",
	goldenForeground: "#3a2e10",
	brown: "#3d3027",
	white: "#ffffff",
} as const;

// Warm surface palette tuned to the WAL GO logo (cream paper, dark-brown ink).
// Passed as the default `colors` so the newsletter reads warmer than the neutral
// `defaultColors` shared by the transactional emails, while still adapting to
// dark mode through `EmailStyles`.
const WARM_SURFACE: EmailColors = {
	light: {
		background: "#faf3f5",
		card: "#fffdfb",
		cardForeground: "#311c0f",
		border: "#ece0d8",
		mutedForeground: "#8c7b6e",
	},
	dark: {
		background: "#17110c",
		card: "#221a12",
		cardForeground: "#f3ebe3",
		border: "#3a2e24",
		mutedForeground: "#b3a496",
	},
};

const newsletterEmailLocalization = {
	LOGO: "Logo",
	READ_MORE: "Read more",
	VIEW_ONLINE: "View online",
	UNSUBSCRIBE: "Unsubscribe",
	EMAIL_SENT_BY: "Email sent by {appName}.",
};

export type NewsletterEmailLocalization = typeof newsletterEmailLocalization;

export interface NewsletterSection {
	/** Section body text. */
	body: string;
	/** Optional thumbnail shown left of the text as a feature row. */
	imageUrl?: string;
	/** Overrides the default "read more" label for this section. */
	linkLabel?: string;
	/** Section heading. */
	title: string;
	/** Optional link the section's "read more" button points to. */
	url?: string;
}

export interface NewsletterEmailProps {
	/** Name of the application sending the newsletter. */
	appName?: string;
	/** Custom CSS class names for styling specific parts of the email. */
	classNames?: EmailClassNames;
	/** Custom color scheme for the surface (background/card) in light/dark. */
	colors?: EmailColors;
	/** Optional primary call-to-action label. */
	ctaLabel?: string;
	/** Optional primary call-to-action URL. */
	ctaUrl?: string;
	/** Whether to enable dark mode support for surfaces. */
	darkMode?: boolean;
	/** Additional React nodes to inject into the email head. */
	head?: ReactNode;
	/** Main headline shown under the logo. */
	heading: string;
	/** Intro paragraph shown under the headline. */
	intro?: string;
	/** Short label shown above the headline (e.g. issue / date). */
	label?: string;
	/** Localization overrides for static labels. */
	localization?: Partial<NewsletterEmailLocalization>;
	/** Logo URL(s) - a single string or light/dark variants. */
	logoURL?: string | { light: string; dark: string };
	/** Text shown in the inbox preview line. */
	preview?: string;
	/** Content blocks rendered in order. */
	sections?: NewsletterSection[];
	/** Link recipients use to unsubscribe. Required by anti-spam law. */
	unsubscribeUrl: string;
	/** Optional link to view the newsletter in a browser. */
	viewOnlineUrl?: string;
}

const renderLogo = (
	logoURL: NewsletterEmailProps["logoURL"],
	alt: string,
	logoClassName?: string
) => {
	if (!logoURL) {
		return null;
	}
	const size = 128;
	if (typeof logoURL === "string") {
		return (
			<Img
				alt={alt}
				className={cn("mx-auto mb-6", logoClassName)}
				height={size}
				src={logoURL}
				width={size}
			/>
		);
	}
	return (
		<>
			<Img
				alt={alt}
				className={cn("logo-light mx-auto mb-6", logoClassName)}
				height={size}
				src={logoURL.light}
				width={size}
			/>
			<Img
				alt={alt}
				className={cn("logo-dark mx-auto mb-6 hidden", logoClassName)}
				height={size}
				src={logoURL.dark}
				width={size}
			/>
		</>
	);
};

export const NewsletterEmail = ({
	heading,
	intro,
	label,
	sections = [],
	ctaLabel,
	ctaUrl,
	appName,
	logoURL,
	preview,
	unsubscribeUrl,
	viewOnlineUrl,
	colors = WARM_SURFACE,
	classNames,
	darkMode = true,
	head,
	...props
}: NewsletterEmailProps) => {
	const localization = {
		...NewsletterEmail.localization,
		...props.localization,
	};

	const previewText = preview || heading;

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
						{viewOnlineUrl && (
							<Text className="mt-0 mb-3 text-center text-muted-foreground text-xs">
								<Link
									className="text-muted-foreground underline"
									href={viewOnlineUrl}
								>
									{localization.VIEW_ONLINE}
								</Link>
							</Text>
						)}

						<Section
							className={cn(
								"overflow-hidden rounded-lg border border-border bg-card text-card-foreground",
								classNames?.card
							)}
						>
							<Section className="px-8 pt-8 pb-6 text-center">
								{renderLogo(
									logoURL,
									appName || localization.LOGO,
									classNames?.logo
								)}

								{label && (
									<Text
										className="m-0 mb-2 text-center font-semibold text-xs uppercase tracking-widest"
										style={{ color: BRAND.rust }}
									>
										{label}
									</Text>
								)}

								<Heading
									className={cn(
										"m-0 text-center font-bold text-3xl",
										classNames?.title
									)}
								>
									{heading}
								</Heading>
							</Section>

							<Section className="px-8 pb-8">
								{intro && (
									<Text
										className={cn(
											"mt-0 mb-2 font-normal text-base leading-7",
											classNames?.content
										)}
									>
										{intro}
									</Text>
								)}

								{sections.map((section, index) => {
									const showDivider = index > 0 || intro;
									const link = section.url && (
										<Text className="mt-2 mb-0 text-sm">
											<Link
												className="font-semibold underline"
												href={section.url}
												style={{ color: BRAND.rust }}
											>
												{section.linkLabel || localization.READ_MORE} →
											</Link>
										</Text>
									);

									return (
										<Section key={section.title}>
											{showDivider && (
												<Hr
													className={cn(
														"my-6 w-full border border-border border-solid",
														classNames?.separator
													)}
												/>
											)}

											{section.imageUrl ? (
												<Row>
													<Column className="w-[112px] pr-4 align-top">
														<Img
															alt={section.title}
															className="rounded-lg"
															height={96}
															src={section.imageUrl}
															style={{ objectFit: "cover" }}
															width={96}
														/>
													</Column>
													<Column className="align-top">
														<Heading
															as="h2"
															className="m-0 mb-1 font-bold text-lg"
														>
															{section.title}
														</Heading>
														<Text
															className={cn(
																"m-0 font-normal text-sm leading-6",
																classNames?.content
															)}
														>
															{section.body}
														</Text>
														{link}
													</Column>
												</Row>
											) : (
												<>
													<Heading
														as="h2"
														className="m-0 mb-2 font-bold text-xl"
													>
														{section.title}
													</Heading>
													<Text
														className={cn(
															"m-0 font-normal text-base leading-7",
															classNames?.content
														)}
													>
														{section.body}
													</Text>
													{link}
												</>
											)}
										</Section>
									);
								})}

								{ctaLabel && ctaUrl && (
									<Section className="mt-8 mb-2 text-center">
										<Button
											className={cn(
												"box-border inline-block whitespace-nowrap rounded-md px-8 py-3 font-bold text-base no-underline",
												classNames?.button
											)}
											href={ctaUrl}
											style={{
												backgroundColor: BRAND.brown,
												color: BRAND.white,
											}}
										>
											{ctaLabel}
										</Button>
									</Section>
								)}
							</Section>
						</Section>

						<Section className="px-8 pt-6 text-center">
							{appName && (
								<Text className="m-0 text-muted-foreground text-xs">
									{localization.EMAIL_SENT_BY.replace("{appName}", appName)}
								</Text>
							)}

							<Text className="m-0 mt-2 text-muted-foreground text-xs">
								<Link
									className="text-muted-foreground underline"
									href={unsubscribeUrl}
								>
									{localization.UNSUBSCRIBE}
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

NewsletterEmail.localization = newsletterEmailLocalization;

NewsletterEmail.PreviewProps = {
	appName: "WAL GO",
	logoURL: {
		light: "https://walgo.lt/logo_512.png",
		dark: "https://walgo.lt/logo_512.png",
	},
	label: "2026 sezonas · Nr. 1",
	heading: "Naujienos iš eterio 📻",
	intro:
		"Sveiki, radijo mėgėjai! Štai kas naujo WAL GO bendruomenėje per pastarąsias savaites.",
	sections: [
		{
			title: "Naujas sezonas prasidėjo",
			body: "Komandos jau kovoja dėl pirmųjų kvadratų. Pasitikrinkite žemėlapį ir prisidėkite prie savo komandos.",
			imageUrl: "https://walgo.lt/og.png",
			url: "https://walgo.lt/map",
			linkLabel: "Žiūrėti žemėlapį",
		},
		{
			title: "Lyderių lentelė",
			body: "Šią savaitę pirmauja žaliųjų komanda. Ar pavyks ją aplenkti šį savaitgalį?",
			imageUrl: "https://walgo.lt/og.png",
			url: "https://walgo.lt/leaderboard",
		},
		{
			title: "Patobulinimai",
			body: "Pagreitintas žemėlapio veikimas, patobulinta ryšių paieška ir pridėta statistikos eksporto galimybė.",
		},
	],
	ctaLabel: "Registruoti ryšį",
	ctaUrl: "https://walgo.lt",
	unsubscribeUrl: "https://walgo.lt/unsubscribe?token=example",
	darkMode: true,
} as NewsletterEmailProps;

export default NewsletterEmail;
