import { setSubscriptionBySignedToken } from "@WAL-GO/api/notifications/subscriptions";
import { getDb } from "@WAL-GO/db";
import { createFileRoute } from "@tanstack/react-router";

type Variant = "success" | "error";

const SUCCESS_ICON =
	'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

const ERROR_ICON =
	'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function page(variant: Variant, title: string, message: string): Response {
	const icon = variant === "success" ? SUCCESS_ICON : ERROR_ICON;
	const html = `<!doctype html>
<html lang="lt">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>${title} – WAL GO</title>
		<style>
			:root {
				--background: #faf3f5;
				--card: #fffdfb;
				--card-foreground: #311c0f;
				--muted-foreground: #8c7b6e;
				--border: #ece0d8;
				--olive: #41592c;
				--rust: #a8472d;
				--shadow: 0 1px 3px rgba(49, 28, 15, 0.08), 0 8px 24px rgba(49, 28, 15, 0.06);
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--background: #17110c;
					--card: #221a12;
					--card-foreground: #f3ebe3;
					--muted-foreground: #b3a496;
					--border: #3a2e24;
					--olive: #8bb56a;
					--rust: #d98a6f;
					--shadow: none;
				}
			}
			* { box-sizing: border-box; }
			body { margin: 0; min-height: 100vh; display: grid; place-items: center;
				background: var(--background); color: var(--card-foreground);
				font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
				letter-spacing: -0.01em; padding: 24px;
				-webkit-font-smoothing: antialiased; }
			main { width: 100%; max-width: 26rem; background: var(--card);
				border: 1px solid var(--border); border-radius: 0.875rem;
				box-shadow: var(--shadow); padding: 2.5rem 2rem; text-align: center; }
			.brand { font-weight: 700; letter-spacing: 0.18em; font-size: 0.75rem;
				text-transform: uppercase; color: var(--muted-foreground);
				margin-bottom: 1.5rem; }
			.icon { display: inline-grid; place-items: center; width: 3.25rem;
				height: 3.25rem; border-radius: 9999px; margin-bottom: 1.25rem; }
			.icon-success { color: var(--olive); background: color-mix(in oklab, var(--olive) 14%, transparent); }
			.icon-error { color: var(--rust); background: color-mix(in oklab, var(--rust) 14%, transparent); }
			h1 { font-family: Georgia, "Times New Roman", serif; font-size: 1.5rem;
				font-weight: 600; margin: 0 0 0.5rem; line-height: 1.2; }
			p { margin: 0; color: var(--muted-foreground); line-height: 1.6;
				font-size: 0.9375rem; }
			.action { margin-top: 1.75rem; }
			a.button { display: inline-block; text-decoration: none;
				background: var(--olive); color: #fff; font-weight: 600;
				font-size: 0.9375rem; padding: 0.625rem 1.25rem; border-radius: 0.625rem; }
		</style>
	</head>
	<body>
		<main>
			<div class="brand">WAL GO</div>
			<div class="icon icon-${variant}">${icon}</div>
			<h1>${title}</h1>
			<p>${message}</p>
			<div class="action">
				<a class="button" href="/settings/account">Tvarkyti prenumeratą</a>
			</div>
		</main>
	</body>
</html>`;
	return new Response(html, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
}

async function unsubscribe(token: string | null): Promise<boolean> {
	if (!token) {
		return false;
	}
	const db = await getDb();
	return await setSubscriptionBySignedToken(db, token, false);
}

// Browser click on the email's unsubscribe link.
async function handleGet({ request }: { request: Request }): Promise<Response> {
	const token = new URL(request.url).searchParams.get("token");
	const ok = await unsubscribe(token);
	return ok
		? page(
				"success",
				"Prenumerata atšaukta",
				"Daugiau nesiųsime WAL GO naujienlaiškio šiuo adresu."
			)
		: page(
				"error",
				"Nuoroda negalioja",
				"Nepavyko atšaukti prenumeratos – nuoroda neteisinga arba pasenusi."
			);
}

// One-click unsubscribe (RFC 8058): mailbox providers POST here directly.
async function handlePost({
	request,
}: {
	request: Request;
}): Promise<Response> {
	const token = new URL(request.url).searchParams.get("token");
	await unsubscribe(token);
	return new Response(null, { status: 200 });
}

export const Route = createFileRoute("/unsubscribe")({
	server: {
		handlers: {
			GET: handleGet,
			POST: handlePost,
		},
	},
});
