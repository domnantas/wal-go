import { walFromMaidenhead } from "@WAL-GO/grid";
import { parseCabrilloBand } from "./bands";
import { mapMode } from "./modes";
import type { DraftQso, SkipReason } from "./types";

const LINE_SPLIT_RE = /\r?\n/;
const FIELD_SPLIT_RE = /\s+/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{4}$/;
const CALLSIGN_RE = /^[A-Z0-9/]+$/;
// A signal report (RST), e.g. 59 / 599. Used to anchor the exchange layout.
const RST_RE = /^\d{2,3}$/;

/** Parse Cabrillo `date` (YYYY-MM-DD) + `time` (HHMM UTC) to an ISO string. */
export function parseCabrilloDateTime(
	date: string,
	time: string
): string | null {
	if (!(DATE_RE.test(date) && TIME_RE.test(time))) {
		return null;
	}
	const iso = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
	const parsed = new Date(iso);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

interface ExchangeFields {
	dxCallRaw: string;
	myCallRaw: string;
	mySquareRaw: string;
	theirSquareRaw: string;
}

/**
 * Split the exchange portion (everything after freq/mo/date/time) into the two
 * stations. Cabrillo always carries an RST for each station, so we anchor on
 * the two numeric reports rather than fixed offsets:
 *
 *   mycall  RST  [mysquare]  dxcall  RST  [theirsquare]
 *
 * This keeps the squares (and callsigns) aligned even when a square is omitted
 * — a missing operator square no longer shifts the RST into the dxcall slot,
 * and a missing contact square is simply empty. The square fields are returned
 * raw (even when malformed, e.g. `ZZ9`) so the review dialog can fix them.
 */
function extractExchange(rest: string[]): ExchangeFields {
	const rstPositions = rest.flatMap((token, index) =>
		RST_RE.test(token) ? [index] : []
	);
	const r1 = rstPositions[0] ?? -1;
	const r2 = rstPositions[1] ?? -1;

	if (r1 >= 1 && r2 > r1) {
		// Tokens between the two RSTs are [mysquare?, dxcall]; the contact call is
		// always the last of them, the operator square the first (when present).
		const between = rest.slice(r1 + 1, r2);
		return {
			myCallRaw: rest[r1 - 1] ?? "",
			mySquareRaw: between.length > 1 ? (between[0] ?? "") : "",
			dxCallRaw: between.at(-1) ?? "",
			theirSquareRaw: rest[r2 + 1] ?? "",
		};
	}

	// No usable RST anchors: fall back to the strict positional layout.
	return {
		myCallRaw: rest[0] ?? "",
		mySquareRaw: rest[2] ?? "",
		dxCallRaw: rest[3] ?? "",
		theirSquareRaw: rest[5] ?? "",
	};
}

function parseQsoLine(
	line: string,
	lineNumber: number,
	fallbackOperatorSquare: string
): DraftQso {
	const parts = line.slice(4).trim().split(FIELD_SPLIT_RE);
	const issues: SkipReason[] = [];

	// spec: freq mo date time mycall rst myexch dxcall rst theirexch [t]
	const [freqStr, modeStr, date, time] = parts;
	const { myCallRaw, mySquareRaw, dxCallRaw, theirSquareRaw } = extractExchange(
		parts.slice(4)
	);

	// A line we cannot split into two stations is structurally broken (a missing
	// square is *not* malformed — it is handled as an empty/invalid square).
	if (!(myCallRaw && dxCallRaw)) {
		issues.push("malformedLine");
	}

	const band = parseCabrilloBand(freqStr ?? "");
	if (!(band || issues.includes("malformedLine"))) {
		issues.push("invalidBand");
	}

	const mode = mapMode(modeStr ?? "");
	if (!(mode || issues.includes("malformedLine"))) {
		issues.push("invalidMode");
	}

	const qsoAt = parseCabrilloDateTime(date ?? "", time ?? "");
	if (!(qsoAt || issues.includes("malformedLine"))) {
		issues.push("invalidDate");
	}

	const contactCallsign = dxCallRaw.toUpperCase();
	if (contactCallsign && !CALLSIGN_RE.test(contactCallsign)) {
		issues.push("invalidCallsign");
	}

	const operatorSquare = mySquareRaw || fallbackOperatorSquare;

	return {
		index: lineNumber,
		raw: line,
		operatorCallsign: myCallRaw.toUpperCase(),
		contactCallsign,
		band,
		mode,
		qsoAt,
		operatorSquare: operatorSquare.toUpperCase(),
		contactSquare: theirSquareRaw.toUpperCase(),
		issues,
	};
}

export interface CabrilloResult {
	qsos: DraftQso[];
	stationCallsign: string | null;
}

export function parseCabrillo(content: string): CabrilloResult {
	const lines = content.split(LINE_SPLIT_RE);
	const qsos: DraftQso[] = [];
	let stationCallsign: string | null = null;
	let fallbackOperatorSquare = "";

	for (const [i, rawLine] of lines.entries()) {
		const line = (rawLine ?? "").trim();
		const upper = line.toUpperCase();

		if (upper.startsWith("CALLSIGN:")) {
			stationCallsign =
				line.slice("CALLSIGN:".length).trim().toUpperCase() || null;
			continue;
		}

		if (upper.startsWith("GRID-LOCATOR:")) {
			fallbackOperatorSquare =
				walFromMaidenhead(line.slice("GRID-LOCATOR:".length).trim()) ?? "";
			continue;
		}

		if (upper.startsWith("QSO:")) {
			qsos.push(parseQsoLine(line, i + 1, fallbackOperatorSquare));
		}
	}

	return { stationCallsign, qsos };
}
