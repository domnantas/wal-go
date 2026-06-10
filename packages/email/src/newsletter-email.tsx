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
	Markdown,
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

// Inline styles for markdown-rendered content (intro + section bodies). Email
// clients ignore the surrounding Tailwind classes on the generated tags, so the
// spacing, lists and link accent are pinned here to match the brand.
const MARKDOWN_STYLES = {
	p: { margin: "0 0 12px", fontSize: "16px", lineHeight: "28px" },
	ul: { margin: "0 0 12px", paddingLeft: "24px" },
	ol: { margin: "0 0 12px", paddingLeft: "24px" },
	li: { margin: "0 0 4px", fontSize: "16px", lineHeight: "24px" },
	h1: { margin: "16px 0 8px", fontSize: "20px", fontWeight: 700 },
	h2: { margin: "16px 0 8px", fontSize: "18px", fontWeight: 700 },
	h3: { margin: "16px 0 8px", fontSize: "16px", fontWeight: 700 },
	link: { color: BRAND.rust, textDecoration: "underline" },
	blockQuote: {
		margin: "0 0 12px",
		paddingLeft: "12px",
		borderLeft: `3px solid ${BRAND.rust}`,
	},
};

const newsletterEmailLocalization = {
	LOGO: "Logo",
	READ_MORE: "Skaityti daugiau",
	VIEW_ONLINE: "View online",
	UNSUBSCRIBE: "Unsubscribe",
	EMAIL_SENT_BY: "Email sent by {appName}.",
};

export type NewsletterEmailLocalization = typeof newsletterEmailLocalization;

// Inert placeholder for previews only. Real sends always inject a per-recipient
// signed URL (walgo.lt/unsubscribe?token=…); a bare URL is never shipped, so
// this stays a no-op `#` rather than a real-looking but broken link.
const PREVIEW_UNSUBSCRIBE_URL = "#";

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
	/**
	 * Link recipients use to unsubscribe. Required by anti-spam law. The sender
	 * passes a per-recipient signed URL (`walgo.lt/unsubscribe?token=…`) that our
	 * own route verifies; in previews it falls back to an inert `#` placeholder.
	 */
	unsubscribeUrl?: string;
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
	unsubscribeUrl = PREVIEW_UNSUBSCRIBE_URL,
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
									<Markdown markdownCustomStyles={MARKDOWN_STYLES}>
										{intro}
									</Markdown>
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

											{section.imageUrl && (
												<Img
													alt={section.title}
													className="mb-4 w-full rounded-lg"
													src={section.imageUrl}
													style={{ objectFit: "cover" }}
													width="100%"
												/>
											)}
											<Heading as="h2" className="m-0 mb-2 font-bold text-xl">
												{section.title}
											</Heading>
											<Markdown markdownCustomStyles={MARKDOWN_STYLES}>
												{section.body}
											</Markdown>
											{link}
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

/** Brand defaults shared by the broadcast send path and the admin preview. */
export const WALGO_NEWSLETTER_DEFAULTS = {
	appName: "WAL GO",
	logoURL: {
		light: "https://walgo.lt/logo_512.png",
		dark: "https://walgo.lt/logo_512.png",
	},
} satisfies Partial<NewsletterEmailProps>;

/** Lithuanian overrides for the template's English static labels. */
export const WALGO_NEWSLETTER_LOCALIZATION: Partial<NewsletterEmailLocalization> =
	{
		READ_MORE: "Skaityti plačiau",
		VIEW_ONLINE: "Žiūrėti naršyklėje",
		UNSUBSCRIBE: "Atsisakyti prenumeratos",
		EMAIL_SENT_BY: "Laišką išsiuntė {appName}.",
	};

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
			body: "Šį mėnesį sutvarkėme kelis dalykus:\n\n- Pagreitintas žemėlapio veikimas\n- Patobulinta ryšių paieška\n- Pridėta statistikos eksporto galimybė\n\nLaukiame jūsų atsiliepimų — rašykite **info@walgo.lt**.",
		},
	],
	ctaLabel: "Registruoti ryšį",
	ctaUrl: "https://walgo.lt",
	unsubscribeUrl: "https://walgo.lt/unsubscribe?token=example",
	darkMode: true,
} as NewsletterEmailProps;

export default NewsletterEmail;
