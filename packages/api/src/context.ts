import { createAuth } from "@WAL-GO/auth";
import { createDb } from "@WAL-GO/db";
import { getHyperdriveConnectionString } from "@WAL-GO/env/server";

export async function createContext({ req }: { req: Request }) {
	const connectionString = await getHyperdriveConnectionString();
	const auth = createAuth(connectionString);
	const session = await auth.api.getSession({ headers: req.headers });

	return {
		auth: null,
		session,
		db: createDb(connectionString),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
