import { setSubscriptionBySignedToken } from "@WAL-GO/api/notifications/subscriptions";
import { getDb } from "@WAL-GO/db";
import { createFileRoute } from "@tanstack/react-router";

function page(title: string, message: string): Response {
	const html = `<!doctype html>
<html lang="lt">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>${title} – WAL GO</title>
		<style>
			body { margin: 0; min-height: 100vh; display: grid; place-items: center;
				background: #f4ecd8; color: #2b2118;
				font-family: system-ui, -apple-system, sans-serif; padding: 24px; }
			main { max-width: 28rem; text-align: center; }
			h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
			p { margin: 0.25rem 0; line-height: 1.5; }
			a { color: #9a3b1b; }
		</style>
	</head>
	<body>
		<main>
			<h1>${title}</h1>
			<p>${message}</p>
			<p><a href="/settings">Tvarkyti prenumeratą paskyros nustatymuose</a></p>
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
				"Prenumerata atšaukta",
				"Daugiau nesiųsime WAL GO naujienlaiškio šiuo adresu."
			)
		: page(
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
