import { createAuth } from "@WAL-GO/auth";
import { getHyperdriveConnectionString } from "@WAL-GO/env/server";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		const connectionString = await getHyperdriveConnectionString();
		try {
			const session = await createAuth(connectionString).api.getSession({
				headers: request.headers,
			});
			return next({ context: { session } });
		} catch (error) {
			console.error("[auth] getSession failed:", error);
			return next({ context: { session: null } });
		}
	}
);
