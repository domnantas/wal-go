import { createAuth } from "@WAL-GO/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const auth = await createAuth();
				return auth.handler(request);
			},
			POST: async ({ request }) => {
				const auth = await createAuth();
				return auth.handler(request);
			},
		},
	},
});
