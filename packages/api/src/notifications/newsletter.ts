import type { getDb } from "@WAL-GO/db";
import { sendEmail } from "@WAL-GO/email/lib/send";
import {
	NewsletterEmail,
	type NewsletterEmailProps,
	WALGO_NEWSLETTER_DEFAULTS,
} from "@WAL-GO/email/newsletter-email";
import { render } from "@react-email/components";
import { createElement } from "react";

import {
	getSubscribedRecipients,
	type Recipient,
	signUnsubscribeToken,
} from "./subscriptions";

type Db = Awaited<ReturnType<typeof getDb>>;

const APP_URL = "https://walgo.lt";
const NEWSLETTER_FROM = "WAL GO <admin@walgo.lt>";
// How many concurrent sends per batch — the CF binding sends one message per
// call, so we fan out in small batches to stay polite to the quota.
const SEND_BATCH_SIZE = 20;

export interface SendNewsletterOptions {
	/** Newsletter content (the per-recipient unsubscribe link is added here). */
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">;
	/** Database handle used to load the opted-in recipients. */
	db: Db;
	/** Email subject line. */
	subject: string;
}

export interface SendNewsletterTestOptions {
	/** Newsletter content rendered with a non-destructive unsubscribe link. */
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">;
	/** Email address that receives the test message. */
	email: string;
	/** Email subject line. */
	subject: string;
}

const unsubscribeUrl = (token: string) =>
	`${APP_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
const TEST_UNSUBSCRIBE_URL = `${APP_URL}/admin`;

/**
 * Renders the newsletter template to HTML for one recipient, injecting their
 * personal unsubscribe link. The admin preview renders the same template
 * client-side with the same shared defaults, so the preview matches what
 * recipients receive (minus the tokenized link).
 */
export function renderNewsletter(
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">,
	recipientUnsubscribeUrl: string
): Promise<string> {
	return render(
		createElement(NewsletterEmail, {
			...WALGO_NEWSLETTER_DEFAULTS,
			...content,
			unsubscribeUrl: recipientUnsubscribeUrl,
		})
	);
}

async function sendToRecipient(
	recipient: Recipient,
	subject: string,
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">
): Promise<void> {
	const url = unsubscribeUrl(await signUnsubscribeToken(recipient.userId));
	const html = await renderNewsletter(content, url);
	await sendEmail({
		from: NEWSLETTER_FROM,
		to: recipient.email,
		subject,
		html,
		headers: {
			"List-Unsubscribe": `<${url}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
	});
}

/** Sends the newsletter draft to one address without bulk-mail headers. */
export async function sendNewsletterTest({
	email,
	subject,
	content,
}: SendNewsletterTestOptions): Promise<void> {
	const html = await renderNewsletter(content, TEST_UNSUBSCRIBE_URL);
	await sendEmail({
		from: NEWSLETTER_FROM,
		to: email,
		subject,
		html,
	});
}

/**
 * Renders and sends the newsletter to every opted-in user via the Cloudflare
 * `EMAIL` binding. Each recipient gets a personal tokenized unsubscribe link
 * plus the one-click `List-Unsubscribe` headers (Gmail/Yahoo bulk rules). Sends
 * in small concurrent batches; returns the number successfully sent.
 */
export async function sendNewsletter({
	subject,
	content,
	db,
}: SendNewsletterOptions): Promise<number> {
	const recipients = await getSubscribedRecipients(db);

	// Batches run sequentially (recipients within a batch concurrently) so total
	// concurrency stays capped at SEND_BATCH_SIZE.
	const counts: number[] = [];
	for (const batch of chunk(recipients, SEND_BATCH_SIZE)) {
		counts.push(await sendBatch(batch, subject, content));
	}
	return counts.reduce((total, count) => total + count, 0);
}

async function sendBatch(
	batch: Recipient[],
	subject: string,
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">
): Promise<number> {
	const results = await Promise.allSettled(
		batch.map((recipient) => sendToRecipient(recipient, subject, content))
	);
	return results.filter((result) => result.status === "fulfilled").length;
}

function chunk<T>(items: T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, index * size + size)
	);
}
