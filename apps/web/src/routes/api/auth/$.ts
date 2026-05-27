import { createAuth } from "@WAL-GO/auth";
import { getHyperdriveConnectionString } from "@WAL-GO/env/server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const connectionString = await getHyperdriveConnectionString();
				const auth = createAuth(connectionString);
				return auth.handler(request);
			},
			POST: async ({ request }) => {
				const connectionString = await getHyperdriveConnectionString();
				const auth = createAuth(connectionString);
				return auth.handler(request);
			},
		},
	},
});
