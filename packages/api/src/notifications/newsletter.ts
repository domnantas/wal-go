import {
	NewsletterEmail,
	type NewsletterEmailProps,
	WALGO_NEWSLETTER_DEFAULTS,
} from "@WAL-GO/email/newsletter-email";
import { env } from "@WAL-GO/env/server";
import { render } from "@react-email/components";
import { createElement } from "react";
import { Resend } from "resend";

const FROM = "WAL GO <noreply@walgo.lt>";

export interface SendNewsletterOptions {
	/**
	 * Newsletter content. The unsubscribe link is handled by Resend (the
	 * template defaults to the `{{{RESEND_UNSUBSCRIBE_URL}}}` merge tag), so it
	 * is omitted here.
	 */
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">;
	/**
	 * Optional schedule time — ISO 8601 (`2026-08-05T11:52:01Z`) or relative
	 * (`in 1 hour`). Omit to send immediately.
	 */
	scheduledAt?: string;
	/** Email subject line. */
	subject: string;
}

/**
 * Renders the newsletter template to an HTML string using the WAL GO defaults.
 * The admin preview renders the same template client-side with the same shared
 * defaults (`WALGO_NEWSLETTER_DEFAULTS`), so the preview matches what recipients
 * receive.
 */
export function renderNewsletter(
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">
): Promise<string> {
	return render(
		createElement(NewsletterEmail, { ...WALGO_NEWSLETTER_DEFAULTS, ...content })
	);
}

/**
 * Renders the newsletter and sends it as a Resend Broadcast to the configured
 * Segment. Resend owns the unsubscribe flow end to end: it replaces the
 * `{{{RESEND_UNSUBSCRIBE_URL}}}` merge tag per contact, hosts the unsubscribe
 * page, sets the one-click `List-Unsubscribe` headers, and skips contacts that
 * have already unsubscribed. Returns the Resend broadcast id.
 */
export async function sendNewsletter({
	subject,
	content,
	scheduledAt,
}: SendNewsletterOptions): Promise<string> {
	const segmentId = env.RESEND_SEGMENT_ID;
	if (!segmentId) {
		throw new Error(
			"RESEND_SEGMENT_ID is not set; cannot send the newsletter broadcast"
		);
	}

	const resend = new Resend(env.RESEND_API_KEY);

	const html = await renderNewsletter(content);

	const { data, error } = await resend.broadcasts.create({
		segmentId,
		from: FROM,
		subject,
		html,
		previewText: content.preview,
		send: true,
		scheduledAt,
	});

	if (error) {
		throw new Error(`Failed to send newsletter broadcast: ${error.message}`);
	}

	return data?.id ?? "";
}
