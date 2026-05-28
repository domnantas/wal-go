import { createAuth } from "@WAL-GO/auth";
import { createDb } from "@WAL-GO/db";

export async function createContext({ req }: { req: Request }) {
	const auth = await createAuth();
	let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
	try {
		session = await auth.api.getSession({ headers: req.headers });
	} catch (error) {
		console.error("[context] getSession failed:", error);
	}

	return {
		auth: null,
		session,
		db: await createDb(),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
