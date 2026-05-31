import { Toaster } from "@WAL-GO/ui/components/sonner";
import { sessionOptions } from "@better-auth-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { PostHogProvider } from "posthog-js/react";
import { ThemeProvider } from "tanstack-theme-kit";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import type { orpc } from "@/utils/orpc";
import { CookieBanner } from "../components/cookie-banner";
import Header from "../components/header";
import { Providers } from "../components/providers";
import appCss from "../index.css?url";

const SITE_URL = "https://walgo.lt";
const SITE_TITLE = "WAL GO | Atrask Lietuvą per radijo bangas";
const SITE_DESCRIPTION =
	"Radijo mėgėjų žaidimas: keliauk, užmegzk ryšius ir kovok dėl WAL kvadratų!";
const SITE_IMAGE_URL = `${SITE_URL}/og.png`;

export type SessionContext = Awaited<ReturnType<typeof getUser>>;

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
	session: SessionContext;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	beforeLoad: async ({ context: { queryClient } }) => {
		const session = await getUser();
		// Seed the shared session query so the library `useSession` reads it on the
		// first (SSR + hydrated) render — no logged-out flash in the header.
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		return { session };
	},
	loader: ({ context }) => ({ session: context.session }),
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: SITE_TITLE,
			},
			{
				name: "description",
				content: SITE_DESCRIPTION,
			},
			{
				name: "apple-mobile-web-app-title",
				content: "WAL GO",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:url",
				content: SITE_URL,
			},
			{
				property: "og:title",
				content: SITE_TITLE,
			},
			{
				property: "og:description",
				content: SITE_DESCRIPTION,
			},
			{
				property: "og:site_name",
				content: "WAL GO",
			},
			{
				property: "og:locale",
				content: "lt_LT",
			},
			{
				property: "og:image",
				content: SITE_IMAGE_URL,
			},
			{
				property: "og:image:width",
				content: "512",
			},
			{
				property: "og:image:height",
				content: "512",
			},
			{
				property: "og:image:alt",
				content: "WAL GO logotipas",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon-96x96.png",
				type: "image/png",
				size: "96x96",
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{
				rel: "shortcut icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
				sizes: "180x180",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="lt" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<PostHogProvider
					apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
					options={{
						api_host: "/ingest",
						ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
						defaults: "2026-01-30",
						capture_exceptions: true,
						debug: import.meta.env.DEV,
						cookieless_mode: "on_reject",
					}}
				>
					<ThemeProvider
						attribute="class"
						disableTransitionOnChange
						enableSystem
					>
						<Providers>
							<div className="grid grid-rows-[auto_1fr]">
								<Header />
								<div>{children}</div>
							</div>
							<Toaster richColors />
							<CookieBanner />
							{/* <TanStackRouterDevtools />
							<ReactQueryDevtools />
							<TanStackDevtools plugins={[formDevtoolsPlugin()]} /> */}
							<Scripts />
						</Providers>
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
