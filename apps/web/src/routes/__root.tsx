import { Toaster } from "@WAL-GO/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "tanstack-theme-kit";
import type { orpc } from "@/utils/orpc";
import Header from "../components/header";
import { Providers } from "../components/providers";
import appCss from "../index.css?url";
export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
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
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider attribute="class">
					<Providers>
						<div className="grid h-svh grid-rows-[auto_1fr]">
							<Header />
							<Outlet />
						</div>
						<Toaster richColors />
						<TanStackRouterDevtools position="bottom-left" />
						<ReactQueryDevtools
							buttonPosition="bottom-right"
							position="bottom"
						/>
						<Scripts />
					</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
