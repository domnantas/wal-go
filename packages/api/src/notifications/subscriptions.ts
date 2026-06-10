import type { getDb } from "@WAL-GO/db";
// biome-ignore lint/performance/noNamespaceImport: schema imports are fine
import * as schema from "@WAL-GO/db/schema";
import { env } from "@WAL-GO/env/server";
import { eq, sql } from "drizzle-orm";

type Db = Awaited<ReturnType<typeof getDb>>;

export interface Recipient {
	email: string;
	name: string;
	userId: string;
}

// Stateless unsubscribe tokens: HMAC-sign the user id with the auth secret so
// the link is self-verifying. No per-row token column, no lookup — the route
// recovers the user id straight from the token. Tokens never expire (unsubscribe
// must keep working indefinitely) and can't be individually revoked, which is
// fine for an idempotent opt-out.
const textEncoder = new TextEncoder();

const bytesToBase64Url = (bytes: Uint8Array): string =>
	btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");

const base64UrlToBytes = (value: string): Uint8Array =>
	Uint8Array.from(
		atob(value.replaceAll("-", "+").replaceAll("_", "/")),
		(char) => char.charCodeAt(0)
	);

const hmacKey = (): Promise<CryptoKey> =>
	crypto.subtle.importKey(
		"raw",
		textEncoder.encode(env.BETTER_AUTH_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"]
	);

/** Builds a signed, self-verifying unsubscribe token for one user. */
export async function signUnsubscribeToken(userId: string): Promise<string> {
	const payload = bytesToBase64Url(textEncoder.encode(userId));
	const signature = await crypto.subtle.sign(
		"HMAC",
		await hmacKey(),
		textEncoder.encode(payload)
	);
	return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/** Recovers the user id from a token, or null if the signature doesn't match. */
async function verifyUnsubscribeToken(token: string): Promise<string | null> {
	const [payload, signature] = token.split(".");
	if (!(payload && signature)) {
		return null;
	}
	const valid = await crypto.subtle.verify(
		"HMAC",
		await hmacKey(),
		base64UrlToBytes(signature),
		textEncoder.encode(payload)
	);
	if (!valid) {
		return null;
	}
	return new TextDecoder().decode(base64UrlToBytes(payload));
}

/**
 * Every user opted in to the newsletter, with the id used to mint their
 * personal unsubscribe token. Only users with a subscription row are included —
 * the sign-up hook / migration backfill keep rows in sync.
 */
export async function getSubscribedRecipients(db: Db): Promise<Recipient[]> {
	return await db
		.select({
			email: schema.user.email,
			name: schema.user.name,
			userId: schema.newsletterSubscription.userId,
		})
		.from(schema.newsletterSubscription)
		.innerJoin(
			schema.user,
			eq(schema.user.id, schema.newsletterSubscription.userId)
		)
		.where(eq(schema.newsletterSubscription.subscribed, true));
}

/**
 * A single user's opt-in state. A missing row reads as subscribed (the default
 * for new contacts), so the settings toggle shows on until the user opts out.
 */
export async function getUserSubscription(
	db: Db,
	userId: string
): Promise<{ subscribed: boolean }> {
	const rows = await db
		.select({ subscribed: schema.newsletterSubscription.subscribed })
		.from(schema.newsletterSubscription)
		.where(eq(schema.newsletterSubscription.userId, userId))
		.limit(1);
	return { subscribed: rows[0]?.subscribed ?? true };
}

/**
 * Upserts a user's opt-in state.
 */
export async function setUserSubscription(
	db: Db,
	userId: string,
	subscribed: boolean
): Promise<void> {
	await db
		.insert(schema.newsletterSubscription)
		.values({ userId, subscribed })
		.onConflictDoUpdate({
			target: schema.newsletterSubscription.userId,
			set: { subscribed },
		});
}

/**
 * Flips a subscription via a signed unsubscribe token (the email link /
 * one-click header). Returns whether the token was valid and matched a row.
 */
export async function setSubscriptionBySignedToken(
	db: Db,
	token: string,
	subscribed: boolean
): Promise<boolean> {
	const userId = await verifyUnsubscribeToken(token);
	if (!userId) {
		return false;
	}
	const updated = await db
		.update(schema.newsletterSubscription)
		.set({ subscribed })
		.where(eq(schema.newsletterSubscription.userId, userId))
		.returning({ userId: schema.newsletterSubscription.userId });
	return updated.length > 0;
}

/**
 * Newsletter audience summary for the admin UI: how many users are opted in vs.
 * the total user count.
 */
export async function getAudienceInfo(
	db: Db
): Promise<{ subscribed: number; total: number }> {
	const [totals] = await db
		.select({
			total: sql<number>`count(*)::int`,
			subscribed: sql<number>`count(*) filter (where coalesce(${schema.newsletterSubscription.subscribed}, true) = true)::int`,
		})
		.from(schema.user)
		.leftJoin(
			schema.newsletterSubscription,
			eq(schema.newsletterSubscription.userId, schema.user.id)
		);
	return { total: totals?.total ?? 0, subscribed: totals?.subscribed ?? 0 };
}
