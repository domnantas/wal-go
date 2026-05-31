import { createAuthScope } from "@WAL-GO/auth";
import { createFileRoute } from "@tanstack/react-router";

async function handleAuth(request: Request): Promise<Response> {
	const { auth, dispose } = await createAuthScope();
	try {
		return await auth.handler(request);
	} catch (err) {
		console.error("[auth handler error]", err, (err as Error)?.cause);
		throw err;
	} finally {
		await dispose();
	}
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleAuth(request),
			POST: ({ request }) => handleAuth(request),
		},
	},
});
