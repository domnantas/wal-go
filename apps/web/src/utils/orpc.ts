import { createContext } from "@WAL-GO/api/context";
import { appRouter } from "@WAL-GO/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import posthog from "posthog-js";
import { toast } from "sonner";

// One QueryClient per request. A module-level singleton would be shared across
// requests on the server (Cloudflare reuses isolate globals), letting one user's
// SSR-seeded session leak into another user's dehydrated HTML.
const captureException = (error: Error) => {
	if (typeof window !== "undefined") {
		posthog.captureException(error);
	}
};

export const makeQueryClient = () =>
	new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				captureException(error);
				toast.error(`Error: ${error.message}`, {
					action: {
						label: "retry",
						onClick: query.invalidate,
					},
				});
			},
		}),
		mutationCache: new MutationCache({
			onError: (error) => {
				captureException(error);
			},
		}),
	});

const getORPCClient = createIsomorphicFn()
	.server(() =>
		createRouterClient(appRouter, {
			context: async () => createContext({ req: getRequest() }),
		})
	)
	.client((): RouterClient<typeof appRouter> => {
		const link = new RPCLink({
			url: `${window.location.origin}/api/rpc`,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		});

		return createORPCClient(link);
	});

export const client: RouterClient<typeof appRouter> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
