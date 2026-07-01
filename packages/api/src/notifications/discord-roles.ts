import { createAuth } from "@WAL-GO/auth";
import type { createDb } from "@WAL-GO/db";
import { account } from "@WAL-GO/db/schema/auth";
import { seasonMembership } from "@WAL-GO/db/schema/seasons";
import { env } from "@WAL-GO/env/server";
import { and, eq } from "drizzle-orm";

import { getCurrentSeason } from "../routers/seasons";
import type { Team } from "../scoring/control";

type Db = ReturnType<typeof createDb>;

const DISCORD_API = "https://discord.com/api/v10";
const PLATFORM_NAME = "WAL GO";

// Numeric value pushed as the `team` linked-role metadata field. Server admins
// configure one linked role per value (integer_equal): 1 → Geltona, etc. `0`
// (no team) matches none, so Discord strips the linked roles.
const TEAM_METADATA_VALUE: Record<Team, number> = {
	yellow: 1,
	green: 2,
	red: 3,
};

/** The Discord application id, or null when linking isn't configured. */
function getAppId(): string | null {
	return env.DISCORD_CLIENT_ID ?? null;
}

/** The Discord user id linked to a WAL GO user, or null when not linked. */
export async function getLinkedDiscordId(
	db: Db,
	userId: string
): Promise<string | null> {
	const rows = await db
		.select({ accountId: account.accountId })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
		.limit(1);
	return rows[0]?.accountId ?? null;
}

/** The user's team in the current season, or null when not a member. */
export async function getCurrentTeam(
	db: Db,
	userId: string
): Promise<Team | null> {
	const currentSeason = await getCurrentSeason(db);
	if (!currentSeason) {
		return null;
	}
	const rows = await db
		.select({ team: seasonMembership.team })
		.from(seasonMembership)
		.where(
			and(
				eq(seasonMembership.userId, userId),
				eq(seasonMembership.seasonId, currentSeason.id)
			)
		)
		.limit(1);
	return rows[0]?.team ?? null;
}

/**
 * A valid Discord OAuth access token for the user's linked account, refreshed
 * via the stored refresh token when expired. Returns null when the user hasn't
 * linked Discord or the refresh fails — callers then no-op.
 */
export async function getAccessTokenForUser(
	db: Db,
	userId: string
): Promise<string | null> {
	try {
		const auth = createAuth(db);
		const result = await auth.api.getAccessToken({
			body: { providerId: "discord", userId },
		});
		return result.accessToken ?? null;
	} catch {
		return null;
	}
}

/**
 * Pushes the `team` linked-role metadata for a user via their OAuth token
 * (scope `role_connections.write`). Discord grants/revokes the configured
 * linked roles from this value. `0` clears the team.
 */
async function pushRoleConnection(
	appId: string,
	accessToken: string,
	teamValue: number
): Promise<void> {
	await fetch(
		`${DISCORD_API}/users/@me/applications/${appId}/role-connection`,
		{
			method: "PUT",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				platform_name: PLATFORM_NAME,
				metadata: { team: String(teamValue) },
			}),
		}
	);
}

/**
 * Idempotently syncs a WAL GO user's Discord linked-role metadata to their
 * current-season team. No-op when linking isn't configured or the user hasn't
 * linked Discord. Throws on unexpected errors so callers can surface or swallow.
 */
export async function syncRoleConnection(
	db: Db,
	userId: string
): Promise<void> {
	const appId = getAppId();
	if (!appId) {
		return;
	}
	const accessToken = await getAccessTokenForUser(db, userId);
	if (!accessToken) {
		return;
	}
	const team = await getCurrentTeam(db, userId);
	const teamValue = team ? TEAM_METADATA_VALUE[team] : 0;
	await pushRoleConnection(appId, accessToken, teamValue);
}

/** Fire-and-forget `syncRoleConnection` for use after a committed mutation. */
export function syncRoleConnectionInBackground(db: Db, userId: string): void {
	syncRoleConnection(db, userId).catch((error) => {
		console.error("Failed to sync Discord linked role", error);
	});
}

/**
 * Clears the team metadata (value `0`) so Discord strips the linked roles.
 * Used on unlink, while the account token is still valid.
 */
export async function clearRoleConnection(
	db: Db,
	userId: string
): Promise<void> {
	const appId = getAppId();
	if (!appId) {
		return;
	}
	const accessToken = await getAccessTokenForUser(db, userId);
	if (!accessToken) {
		return;
	}
	await pushRoleConnection(appId, accessToken, 0);
}

/** The Discord handle for a linked account, via its OAuth token. */
export async function fetchDiscordUsername(
	accessToken: string
): Promise<string | null> {
	const response = await fetch(`${DISCORD_API}/users/@me`, {
		headers: { authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) {
		return null;
	}
	const profile = (await response.json()) as { username?: string };
	return profile.username ?? null;
}
