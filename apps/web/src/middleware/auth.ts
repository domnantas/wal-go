import { createAuth } from "@WAL-GO/auth";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		try {
			const session = await (await createAuth()).api.getSession({
				headers: request.headers,
			});
			return next({ context: { session } });
		} catch (error) {
			console.error("[auth] getSession failed:", error);
			return next({ context: { session: null } });
		}
	}
);
