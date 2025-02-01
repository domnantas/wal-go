import type { Endpoint } from "one";
import { auth } from "~/auth";

// TODO: investigate better approach
const authAPIHandler = () => {
	return async (req: Request) => {
		try {
			return auth.handler(req);
		} catch (error) {
			console.error(error);
			return new Response("Error", { status: 500 });
		}
	};
};

export const GET: Endpoint = authAPIHandler();

export const POST: Endpoint = authAPIHandler();
