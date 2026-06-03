import { parseAdifBand } from "./bands";
import { mapMode } from "./modes";
import type { DraftQso, SkipReason } from "./types.ts";

const CALLSIGN_RE = /^[A-Z0-9/]+$/;
const ADIF_DATE_RE = /^\d{8}$/;
const ADIF_TIME_RE = /^\d{4}(\d{2})?$/;

interface RawRecord {
	fields: Map<string, string>;
	raw: string;
}

interface AdifDocument {
	header: Map<string, string>;
	records: RawRecord[];
}

/**
 * Walk an ADIF document into a header field map and per-record field maps.
 * Field names are lower-cased. `<EOH>` ends the header; `<EOR>` ends a record.
 * Field values honour the declared length when present, otherwise read up to
 * the next tag (lenient).
 */
function parseAdifDocument(content: string): AdifDocument {
	const header = new Map<string, string>();
	const records: RawRecord[] = [];
	let current = new Map<string, string>();
	let inHeader = content.toLowerCase().includes("<eoh>");
	let recordStart = 0;
	let position = 0;

	const commitRecord = (endIndex: number) => {
		records.push({
			fields: current,
			raw: content.slice(recordStart, endIndex).trim(),
		});
		current = new Map<string, string>();
		recordStart = endIndex;
	};

	while (position < content.length) {
		const open = content.indexOf("<", position);
		if (open === -1) {
			break;
		}
		const close = content.indexOf(">", open);
		if (close === -1) {
			break;
		}

		const tag = content.slice(open + 1, close);
		const [nameRaw, lengthRaw] = tag.split(":");
		const name = (nameRaw ?? "").trim().toLowerCase();

		if (name === "eoh") {
			inHeader = false;
			position = close + 1;
			recordStart = position;
			continue;
		}

		if (name === "eor") {
			position = close + 1;
			commitRecord(position);
			continue;
		}

		const length = Number.parseInt(lengthRaw ?? "", 10);
		const field = readFieldValue(content, close + 1, length);
		if (name) {
			const target = inHeader ? header : current;
			target.set(name, field.value);
		}
		position = field.nextIndex;
	}

	// Trailing record without an explicit <EOR>.
	if (current.size > 0) {
		commitRecord(content.length);
	}

	return { header, records };
}

function readFieldValue(
	content: string,
	start: number,
	length: number
): { value: string; nextIndex: number } {
	if (Number.isNaN(length)) {
		const nextTag = content.indexOf("<", start);
		const end = nextTag === -1 ? content.length : nextTag;
		return { value: content.slice(start, end).trim(), nextIndex: end };
	}
	const end = start + length;
	return { value: content.slice(start, end), nextIndex: end };
}

/** Parse ADIF QSO_DATE (YYYYMMDD) + TIME_ON (HHMM[SS] UTC) to an ISO string. */
export function parseAdifDateTime(date: string, time: string): string | null {
	if (!(ADIF_DATE_RE.test(date) && ADIF_TIME_RE.test(time))) {
		return null;
	}
	const year = date.slice(0, 4);
	const month = date.slice(4, 6);
	const day = date.slice(6, 8);
	const hour = time.slice(0, 2);
	const minute = time.slice(2, 4);
	const second = time.length === 6 ? time.slice(4, 6) : "00";
	const parsed = new Date(
		`${year}-${month}-${day}T${hour}:${minute}:${second}Z`
	);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function recordToDraft(
	record: RawRecord,
	index: number,
	headerStation: string | null
): DraftQso {
	const { fields } = record;
	const issues: SkipReason[] = [];

	const operatorCallsign = (
		fields.get("station_callsign") ??
		fields.get("operator") ??
		headerStation ??
		""
	)
		.trim()
		.toUpperCase();

	const band = parseAdifBand(fields.get("band"), fields.get("freq"));
	if (!band) {
		issues.push("invalidBand");
	}

	const mode =
		mapMode(fields.get("mode") ?? "") ?? mapMode(fields.get("submode") ?? "");
	if (!mode) {
		issues.push("invalidMode");
	}

	const qsoAt = parseAdifDateTime(
		(fields.get("qso_date") ?? "").trim(),
		(fields.get("time_on") ?? "").trim()
	);
	if (!qsoAt) {
		issues.push("invalidDate");
	}

	const contactCallsign = (fields.get("call") ?? "").trim().toUpperCase();
	if (!(contactCallsign && CALLSIGN_RE.test(contactCallsign))) {
		issues.push("invalidCallsign");
	}

	return {
		index,
		raw: record.raw,
		operatorCallsign,
		contactCallsign,
		band,
		mode,
		qsoAt,
		// MY_SIG/SIG are expected to be "WAL" but are intentionally ignored.
		operatorSquare: (fields.get("my_sig_info") ?? "").trim().toUpperCase(),
		contactSquare: (fields.get("sig_info") ?? "").trim().toUpperCase(),
		issues,
	};
}

export interface AdifResult {
	qsos: DraftQso[];
	stationCallsign: string | null;
}

export function parseAdif(content: string): AdifResult {
	const { header, records } = parseAdifDocument(content);

	const headerStation =
		header.get("station_callsign") ?? header.get("operator") ?? null;
	const firstRecord = records[0]?.fields;
	const stationCallsign =
		firstRecord?.get("station_callsign") ??
		firstRecord?.get("operator") ??
		headerStation;

	return {
		stationCallsign: stationCallsign?.trim().toUpperCase() || null,
		qsos: records.map((record, i) =>
			recordToDraft(record, i + 1, headerStation)
		),
	};
}
