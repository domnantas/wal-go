import {
	NewsletterEmail,
	type NewsletterEmailProps,
} from "@WAL-GO/email/newsletter-email";
import { env } from "@WAL-GO/env/server";
import { render } from "@react-email/components";
import { createElement } from "react";
import { Resend } from "resend";

const FROM = "WAL GO <noreply@walgo.lt>";

// Resend caps a single send at 50 recipients, so larger batches are chunked.
const RECIPIENT_BATCH_SIZE = 50;

export interface NewsletterRecipient {
	email: string;
	/** Per-recipient unsubscribe link. */
	unsubscribeUrl: string;
}

export interface SendNewsletterOptions {
	/**
	 * Newsletter content shared by every recipient. The per-recipient
	 * `unsubscribeUrl` is filled in from each recipient, so it is omitted here.
	 */
	content: Omit<NewsletterEmailProps, "unsubscribeUrl">;
	/** Recipients with their individual unsubscribe links. */
	recipients: NewsletterRecipient[];
	/** Email subject line. */
	subject: string;
}

const WALGO_DEFAULTS = {
	appName: "WAL GO",
	logoURL: {
		light: "https://walgo.lt/logo_512.png",
		dark: "https://walgo.lt/logo_512.png",
	},
} satisfies Partial<NewsletterEmailProps>;

function chunk<T>(items: T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, index * size + size)
	);
}

/**
 * Renders the newsletter once per recipient (each gets their own unsubscribe
 * link) and sends them through Resend's batch endpoint. Returns the number of
 * messages handed to Resend. Defaults to WAL GO branding and logo.
 */
export async function sendNewsletter({
	subject,
	recipients,
	content,
}: SendNewsletterOptions): Promise<number> {
	if (recipients.length === 0) {
		return 0;
	}

	const resend = new Resend(env.RESEND_API_KEY);

	const messages = await Promise.all(
		recipients.map(async (recipient) => {
			const html = await render(
				createElement(NewsletterEmail, {
					...WALGO_DEFAULTS,
					...content,
					unsubscribeUrl: recipient.unsubscribeUrl,
				})
			);
			return {
				from: FROM,
				to: recipient.email,
				subject,
				html,
				headers: {
					"List-Unsubscribe": `<${recipient.unsubscribeUrl}>`,
					"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
				},
			};
		})
	);

	for (const batch of chunk(messages, RECIPIENT_BATCH_SIZE)) {
		await resend.batch.send(batch);
	}

	return messages.length;
}
