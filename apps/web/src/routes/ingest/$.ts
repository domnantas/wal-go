import { createFileRoute } from "@tanstack/react-router";

const ASSETS_HOST = "https://eu-assets.i.posthog.com";
const INGEST_HOST = "https://eu.i.posthog.com";
const INGEST_PREFIX_RE = /^\/ingest/;

function getTarget(path: string): string {
	const stripped = path.replace(INGEST_PREFIX_RE, "");
	return stripped.startsWith("/static") || stripped.startsWith("/array")
		? ASSETS_HOST
		: INGEST_HOST;
}

function handleIngest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const target = getTarget(url.pathname);
	const stripped = url.pathname.replace(INGEST_PREFIX_RE, "");
	const targetUrl = `${target}${stripped}${url.search}`;

	return fetch(targetUrl, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	});
}

export const Route = createFileRoute("/ingest/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleIngest(request),
			POST: ({ request }) => handleIngest(request),
		},
	},
});
