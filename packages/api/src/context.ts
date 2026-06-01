import { createAuth } from "@WAL-GO/auth";
import { getDb } from "@WAL-GO/db";

export async function createContext({ req }: { req: Request }) {
	const db = await getDb();
	const auth = createAuth(db);
	let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
	try {
		session = await auth.api.getSession({ headers: req.headers });
	} catch (error) {
		console.error(
			"[context] getSession failed:",
			error,
			"cause:",
			(error as Error)?.cause
		);
	}

	return {
		auth: null,
		session,
		db,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
