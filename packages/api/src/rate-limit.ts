import { rateLimit as rateLimitTable } from "@WAL-GO/db/schema/auth";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

type Db = Context["db"];

export async function checkRateLimit(
	db: Db,
	key: string,
	max: number,
	windowSecs: number
): Promise<void> {
	const windowMs = windowSecs * 1000;
	const now = Date.now();

	const rows = await db
		.select()
		.from(rateLimitTable)
		.where(eq(rateLimitTable.key, key))
		.limit(1);

	const existing = rows[0];

	if (existing) {
		const withinWindow = now - existing.lastRequest < windowMs;
		if (withinWindow && existing.count >= max) {
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: "Per daug užklausų. Bandykite vėliau.",
			});
		}
		await db
			.update(rateLimitTable)
			.set({
				count: withinWindow ? existing.count + 1 : 1,
				lastRequest: now,
			})
			.where(eq(rateLimitTable.key, key));
	} else {
		await db.insert(rateLimitTable).values({ key, count: 1, lastRequest: now });
	}
}
