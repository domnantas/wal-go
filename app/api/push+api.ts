import type { Endpoint } from "one";
import {
	PostgresJSConnection,
	PushProcessor,
	ZQLDatabase,
} from "@rocicorp/zero/pg";
import { schema } from "~/zero/schema";
import { db } from "~/db";
import { createMutators } from "~/zero/mutators";
import { validateAndDecodeAuthData } from "~/auth/authData";

const processor = new PushProcessor(
	new ZQLDatabase(new PostgresJSConnection(db.$client), schema),
);

export const POST: Endpoint = async (request) => {
	const authorizationHeader = request.headers.get("authorization");
	if (!authorizationHeader) {
		return new Response("Missing Authorization header", { status: 401 });
	}
	if (!authorizationHeader.startsWith("Bearer ")) {
		return new Response("Invalid Authorization header", { status: 401 });
	}

	const token = authorizationHeader.replace("Bearer ", "");
	const authData = await validateAndDecodeAuthData(token);
	return Response.json(
		await processor.process(createMutators(authData), request),
	);
};
