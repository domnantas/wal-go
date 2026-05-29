import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import "./index.css";
import { ErrorPage } from "./components/error-page";
import Loader from "./components/loader";
import { NotFound } from "./components/not-found";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: { orpc, queryClient, session: null },
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: NotFound,
		defaultErrorComponent: ({ error, reset }) => (
			<ErrorPage error={error} reset={reset} />
		),
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
