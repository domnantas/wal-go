import { createAuthScope } from "@WAL-GO/auth";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		const { auth, dispose } = await createAuthScope();
		try {
			const session = await auth.api.getSession({
				headers: request.headers,
			});
			return next({ context: { session } });
		} catch (error) {
			console.error(
				"[auth] getSession failed:",
				error,
				"cause:",
				(error as Error)?.cause
			);
			return next({ context: { session: null } });
		} finally {
			await dispose();
		}
	}
);
