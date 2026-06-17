// Outbound email transport over the Cloudflare `send_email` Worker binding
// (Email Sending). Lives in the template package because both `@WAL-GO/auth`
// and `@WAL-GO/api` already depend on it, and `auth` can't depend on `api`
// (api depends on auth). The react-email dev server only imports the template
// `.tsx` files, never this module, so it stays free of runtime concerns.

const DEFAULT_FROM = "WAL GO <noreply@walgo.lt>";

export interface OutboundEmail {
	from?: string;
	headers?: Record<string, string>;
	html: string;
	subject: string;
	text?: string;
	to: string;
}

// Minimal shape of the native Cloudflare `SendEmail` binding's builder-form
// `send` (see @cloudflare/workers-types `SendEmail`). Typed locally so the
// template package gains no `@cloudflare/workers-types` dependency.
interface EmailBinding {
	send(message: {
		from: string;
		to: string;
		subject: string;
		html?: string;
		text?: string;
		headers?: Record<string, string>;
	}): Promise<unknown>;
}

// Resolve the binding the same way `@WAL-GO/db` resolves Hyperdrive: import
// `cloudflare:workers` lazily through a string specifier so bundlers outside
// the Worker runtime don't choke on it.
async function getEmailBinding(): Promise<EmailBinding | undefined> {
	try {
		const mod = "cloudflare:workers";
		/* @vite-ignore */
		const { env } = (await import(mod)) as {
			env: { EMAIL?: EmailBinding };
		};
		return env.EMAIL;
	} catch {
		// cloudflare:workers not available outside the Worker runtime.
		return;
	}
}

/**
 * Sends one email through the Cloudflare `EMAIL` binding. Outside the Worker
 * runtime (local node dev) there is no binding, so the send is logged and
 * skipped rather than throwing — callers treat delivery as best-effort.
 */
export async function sendEmail(message: OutboundEmail): Promise<void> {
	const binding = await getEmailBinding();
	if (!binding) {
		const links = [...(message.html ?? "").matchAll(/href="([^"]+)"/g)].map(
			(match) => match[1]
		);
		console.warn(
			`[email] no EMAIL binding; skipped send to ${message.to} (${message.subject})`,
			links.length > 0 ? { links } : ""
		);
		return;
	}

	await binding.send({
		from: message.from ?? DEFAULT_FROM,
		to: message.to,
		subject: message.subject,
		html: message.html,
		text: message.text,
		headers: message.headers,
	});
}
