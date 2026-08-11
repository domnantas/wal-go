import { getDb } from "@WAL-GO/db";
import { qso } from "@WAL-GO/db/schema/qsos";
import { env } from "@WAL-GO/env/server";
import { generateAdif } from "@WAL-GO/log-parse";
import { timingSafeEqual } from "node:crypto";
import { TZDate } from "@date-fns/tz";
import { createFileRoute } from "@tanstack/react-router";
import { endOfMonth, set, startOfMonth } from "date-fns";
import { and, asc, gte, lte } from "drizzle-orm";

// Month boundaries follow the competition's own time zone, matching the
// game-duplicate day-boundary logic in packages/api/src/scoring/*.ts.
const TIME_ZONE = "Europe/Vilnius";

function parseMonthParams(url: URL): { year: number; month: number } | null {
	const year = Number.parseInt(url.searchParams.get("year") ?? "", 10);
	const month = Number.parseInt(url.searchParams.get("month") ?? "", 10);
	if (!(Number.isInteger(year) && Number.isInteger(month))) {
		return null;
	}
	if (month < 1 || month > 12) {
		return null;
	}
	return { year, month };
}

function isAuthorized(request: Request): boolean {
	const apiKey = env.ADIF_EXPORT_API_KEY;
	if (!apiKey) {
		return false;
	}
	const authHeader = request.headers.get("authorization") ?? "";
	const providedKey = authHeader.startsWith("Bearer ")
		? authHeader.slice("Bearer ".length)
		: "";
	const provided = Buffer.from(providedKey);
	const expected = Buffer.from(apiKey);
	return (
		provided.length === expected.length && timingSafeEqual(provided, expected)
	);
}

async function handleExport(request: Request): Promise<Response> {
	if (!isAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const params = parseMonthParams(new URL(request.url));
	if (!params) {
		return new Response("Invalid year or month", { status: 400 });
	}

	const monthStart = startOfMonth(
		set(new TZDate(Date.now(), TIME_ZONE), {
			year: params.year,
			month: params.month - 1,
			date: 1,
		})
	);
	const monthEnd = endOfMonth(monthStart);
	const currentMonthStart = startOfMonth(new TZDate(Date.now(), TIME_ZONE));
	if (monthStart.getTime() >= currentMonthStart.getTime()) {
		return new Response("Only past months are available", { status: 400 });
	}

	const db = await getDb();

	const rows = await db
		.select({
			band: qso.band,
			contactCallsign: qso.contactCallsign,
			contactSquare: qso.contactSquare,
			mode: qso.mode,
			operatorSquare: qso.operatorSquare,
			qsoAt: qso.qsoAt,
		})
		.from(qso)
		.where(and(gte(qso.qsoAt, monthStart), lte(qso.qsoAt, monthEnd)))
		.orderBy(asc(qso.qsoAt));

	const adifText = generateAdif(rows);
	return new Response(adifText, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

export const Route = createFileRoute("/api/adif/export")({
	server: {
		handlers: {
			GET: ({ request }) => handleExport(request),
		},
	},
});
