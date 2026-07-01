import { user } from "@WAL-GO/db/schema/auth";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";
import {
	clearRoleConnection,
	fetchDiscordUsername,
	getAccessTokenForUser,
	getCurrentTeam,
	getLinkedDiscordId,
	syncRoleConnection,
} from "../notifications/discord-roles";

const status = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id;
	const rows = await context.db
		.select({ discordUsername: user.discordUsername })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	const discordId = await getLinkedDiscordId(context.db, userId);
	if (!discordId) {
		return { linked: false as const };
	}
	return {
		linked: true as const,
		discordUsername: rows[0]?.discordUsername ?? null,
		team: await getCurrentTeam(context.db, userId),
	};
});

/**
 * Completes a freshly linked Discord account: backfills the handle for display
 * and pushes the team linked-role metadata. Awaited so the settings UI can
 * surface success or failure. Idempotent — safe to call again as a manual
 * resync.
 */
const resync = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id;
	const accessToken = await getAccessTokenForUser(context.db, userId);
	if (!accessToken) {
		return { ok: false as const, reason: "not-linked" as const };
	}

	const username = await fetchDiscordUsername(accessToken);
	if (username) {
		await context.db
			.update(user)
			.set({ discordUsername: username })
			.where(eq(user.id, userId));
	}

	await syncRoleConnection(context.db, userId);
	return { ok: true as const };
});

/**
 * Clears the team metadata (so Discord strips the linked roles) and clears the
 * stored handle while the link still exists. The account row itself is removed
 * client-side via `authClient.unlinkAccount` after this resolves.
 */
const unlink = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id;
	await clearRoleConnection(context.db, userId);
	await context.db
		.update(user)
		.set({ discordUsername: null })
		.where(eq(user.id, userId));
	return { ok: true as const };
});

export const discordRouter = {
	status,
	resync,
	unlink,
};
