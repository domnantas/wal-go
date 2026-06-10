import { getDb } from "@WAL-GO/db";
// biome-ignore lint/performance/noNamespaceImport: schema imports are fine
import * as schema from "@WAL-GO/db/schema";
import { env } from "@WAL-GO/env/server";
import { type Contact, Resend } from "resend";

const CONTACTS_PAGE_SIZE = 100;

export interface AudienceInfo {
	/** Whether RESEND_SEGMENT_ID is set. */
	configured: boolean;
	/** Contacts still subscribed (total - unsubscribed). */
	subscribed: number;
	/** Total contacts in the audience. */
	total: number;
	/** Contacts that have unsubscribed. */
	unsubscribed: number;
}

/**
 * Returns every contact in the audience, paging through Resend's cursor-based
 * list. Recursive (no mutable cursor) — the audience is small enough that the
 * page accumulation cost is irrelevant.
 */
async function listAllContacts(
	resend: Resend,
	segmentId: string,
	after?: string,
	collected: Contact[] = []
): Promise<Contact[]> {
	const { data, error } = await resend.contacts.list({
		segmentId,
		limit: CONTACTS_PAGE_SIZE,
		after,
	});
	if (error) {
		throw new Error(`Failed to list Resend contacts: ${error.message}`);
	}

	const page = data?.data ?? [];
	const combined = [...collected, ...page];
	const cursor = page.at(-1)?.id;

	if (data?.has_more && cursor) {
		return listAllContacts(resend, segmentId, cursor, combined);
	}
	return combined;
}

/**
 * Summary of the Resend Audience for the admin UI. Returns `configured: false`
 * (and zeroed counts) when no audience is set, rather than throwing, so the UI
 * can render a setup hint.
 */
export async function getAudienceInfo(): Promise<AudienceInfo> {
	const segmentId = env.RESEND_SEGMENT_ID;
	if (!segmentId) {
		return { configured: false, total: 0, subscribed: 0, unsubscribed: 0 };
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const contacts = await listAllContacts(resend, segmentId);
	const unsubscribed = contacts.filter(
		(contact) => contact.unsubscribed
	).length;

	return {
		configured: true,
		total: contacts.length,
		subscribed: contacts.length - unsubscribed,
		unsubscribed,
	};
}

export interface UserSubscription {
	/** Whether RESEND_SEGMENT_ID is set (the toggle is usable). */
	configured: boolean;
	/** Whether the user currently receives the newsletter. */
	subscribed: boolean;
}

const NOT_FOUND_STATUS = 404;

/**
 * Reads a single user's newsletter status straight from their Resend contact —
 * no local copy. A missing contact (or unset segment) reads as not subscribed.
 */
export async function getUserSubscription(
	email: string
): Promise<UserSubscription> {
	if (!env.RESEND_SEGMENT_ID) {
		return { configured: false, subscribed: false };
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const { data, error } = await resend.contacts.get({ email });
	if (error || !data) {
		return { configured: true, subscribed: false };
	}
	return { configured: true, subscribed: !data.unsubscribed };
}

/**
 * Flips a user's newsletter subscription on their Resend contact. Receiving the
 * broadcast needs both: the contact in the segment AND `unsubscribed: false`, so
 * opting in sets the flag and guarantees segment membership (the contact may
 * exist outside our segment). Opting in also creates the contact if it doesn't
 * exist yet; opting out of a non-existent contact is a no-op. Throws on
 * unexpected Resend failures so the UI can surface them.
 */
export async function setUserSubscription(
	user: { email: string; name: string },
	subscribed: boolean
): Promise<void> {
	const segmentId = env.RESEND_SEGMENT_ID;
	if (!segmentId) {
		throw new Error("RESEND_SEGMENT_ID is not set; cannot update subscription");
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const { error } = await resend.contacts.update({
		email: user.email,
		unsubscribed: !subscribed,
	});

	if (error) {
		if (error.statusCode !== NOT_FOUND_STATUS) {
			throw new Error(`Failed to update subscription: ${error.message}`);
		}
		// No contact yet: create one (in the segment) when opting in; nothing to
		// do when opting out.
		if (!subscribed) {
			return;
		}
		const { error: createError } = await resend.contacts.create({
			email: user.email,
			firstName: user.name,
			unsubscribed: false,
			segments: [{ id: segmentId }],
		});
		if (createError) {
			throw new Error(`Failed to subscribe: ${createError.message}`);
		}
		return;
	}

	// Existing contact updated. On opt-in, also ensure segment membership — the
	// unsubscribed flag alone isn't enough, broadcasts only target the segment.
	// Idempotent: a no-op when already a member.
	if (subscribed) {
		const { error: segmentError } = await resend.contacts.segments.add({
			email: user.email,
			segmentId,
		});
		if (segmentError) {
			throw new Error(`Failed to add to segment: ${segmentError.message}`);
		}
	}
}

/**
 * Backfills the Resend Audience from the user table: adds a contact for every
 * user not already in the audience. Existing contacts are left untouched, so
 * anyone who unsubscribed stays unsubscribed. Returns the number of contacts
 * created. New users are added on sign-up by the auth hook, so this is mainly
 * for the initial import and reconciliation.
 */
export async function syncAllContacts(): Promise<number> {
	const segmentId = env.RESEND_SEGMENT_ID;
	if (!segmentId) {
		throw new Error("RESEND_SEGMENT_ID is not set; cannot sync contacts");
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const db = await getDb();

	const users = await db
		.select({ email: schema.user.email, name: schema.user.name })
		.from(schema.user);

	const existing = new Set(
		(await listAllContacts(resend, segmentId)).map((contact) =>
			contact.email.toLowerCase()
		)
	);

	const missing = users.filter(
		(user) => !existing.has(user.email.toLowerCase())
	);

	const results = await Promise.allSettled(
		missing.map((user) =>
			resend.contacts.create({
				email: user.email,
				firstName: user.name,
				segments: [{ id: segmentId }],
			})
		)
	);

	return results.filter((result) => result.status === "fulfilled").length;
}
