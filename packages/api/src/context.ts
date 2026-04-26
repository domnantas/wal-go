import { createAuth } from "@WAL-GO/auth";
import { createDb } from "@WAL-GO/db";

export async function createContext({ req }: { req: Request }) {
	const session = await createAuth().api.getSession({
		headers: req.headers,
	});
	return {
		auth: null,
		session,
		db: createDb(),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
