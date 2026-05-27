import { createAuth } from "@WAL-GO/auth";
import { createDb } from "@WAL-GO/db";
import { getHyperdriveConnectionString } from "@WAL-GO/env/server";

export async function createContext({ req }: { req: Request }) {
	const connectionString = await getHyperdriveConnectionString();
	const auth = createAuth(connectionString);
	let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
	try {
		session = await auth.api.getSession({ headers: req.headers });
	} catch (error) {
		console.error("[context] getSession failed:", error);
	}

	return {
		auth: null,
		session,
		db: createDb(connectionString),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
