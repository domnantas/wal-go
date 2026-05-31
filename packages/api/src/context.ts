import { createAuth } from "@WAL-GO/auth";
import { getDb } from "@WAL-GO/db";

export async function createContext({ req }: { req: Request }) {
	const { db, dispose } = await getDb();
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
		// Callers must invoke dispose() when the request ends to release the
		// per-request client on Workers (noop on Node's shared pool).
		dispose,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
