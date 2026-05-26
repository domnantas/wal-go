import { Toaster } from "@WAL-GO/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { ThemeProvider } from "tanstack-theme-kit";
import { getUser } from "@/functions/get-user";
import type { orpc } from "@/utils/orpc";
import Header from "../components/header";
import { Providers } from "../components/providers";
import appCss from "../index.css?url";

export type SessionContext = Awaited<ReturnType<typeof getUser>>;

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
	session: SessionContext;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	async beforeLoad() {
		const session = await getUser();
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
				title: "WAL GO — Lietuvos mėgėjų radijo varžybos",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const { session } = Route.useLoaderData();
	return (
		<html lang="lt" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider attribute="class" disableTransitionOnChange enableSystem>
					<Providers>
						<div className="grid grid-rows-[auto_1fr] md:h-svh">
							<Header session={session} />
							<div className="md:min-h-0 md:overflow-y-auto">{children}</div>
						</div>
						<Toaster richColors />
						{/* <TanStackRouterDevtools />
						<ReactQueryDevtools />
						<TanStackDevtools plugins={[formDevtoolsPlugin()]} /> */}
						<Scripts />
					</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
