type QsoMode = "CW" | "SSB" | "FM" | "DIGI";

export type ParseSkipReason =
	| "invalidBand"
	| "invalidCallsign"
	| "invalidMode"
	| "invalidSquare"
	| "malformedLine";

export interface CabrilloQso {
	band: string;
	contactCallsign: string;
	contactSquare: string | null;
	lineNumber: number;
	mode: QsoMode;
	mycall: string;
	operatorSquare: string;
	qsoDate: string;
	qsoTime: string;
	rawLine: string;
}

export interface CabrilloParseError {
	lineNumber: number;
	rawLine: string;
	reason: ParseSkipReason;
}

export interface CabrilloParseResult {
	callsign: string | null;
	contest: string | null;
	parseErrors: CabrilloParseError[];
	qsos: CabrilloQso[];
}

const FREQ_RANGES: [number, number, string][] = [
	[1800, 2000, "160m"],
	[3500, 4000, "80m"],
	[5000, 5500, "60m"],
	[7000, 7300, "40m"],
	[10_100, 10_150, "30m"],
	[14_000, 14_350, "20m"],
	[18_068, 18_168, "17m"],
	[21_000, 21_450, "15m"],
	[24_890, 24_990, "12m"],
	[28_000, 29_700, "10m"],
	[50_000, 54_000, "6m"],
	[70_000, 70_500, "4m"],
	[144_000, 148_000, "2m"],
	[430_000, 440_000, "70cm"],
	[1_240_000, 1_300_000, "24cm"],
	[2_300_000, 2_450_000, "13cm"],
	[3_300_000, 3_500_000, "9cm"],
	[5_650_000, 5_850_000, "6cm"],
	[10_000_000, 10_500_000, "3cm"],
];

// Cabrillo v3 band designators: VHF/UHF in MHz and microwave G-suffix strings
const BAND_DESIGNATOR_MAP: Record<string, string> = {
	"50": "6m",
	"70": "4m",
	"144": "2m",
	"432": "70cm",
	"1.2G": "24cm",
	"2.3G": "13cm",
	"3.4G": "9cm",
	"5.7G": "6cm",
	"10G": "3cm",
	"24G": "12mm",
	"47G": "6mm",
	"75G": "4mm",
	"122G": "2.5mm",
	"134G": "2mm",
	"241G": "1mm",
};

const LINE_SPLIT_RE = /\r?\n/;
const FIELD_SPLIT_RE = /\s+/;
const WAL_SQUARE_RE = /^[A-Z]\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{4}$/;
const CALLSIGN_RE = /^[A-Z0-9/]+$/;

function freqToBand(freqKhz: number): string | null {
	for (const [lo, hi, bandName] of FREQ_RANGES) {
		if (freqKhz >= lo && freqKhz <= hi) {
			return bandName;
		}
	}
	return null;
}

function parseBand(freqStr: string): string | null {
	const literal = BAND_DESIGNATOR_MAP[freqStr.toUpperCase()];
	if (literal !== undefined) {
		return literal;
	}
	const freq = Number.parseInt(freqStr, 10);
	if (Number.isNaN(freq)) {
		return null;
	}
	return freqToBand(freq);
}

function mapMode(raw: string): QsoMode | null {
	switch (raw.toUpperCase()) {
		case "CW":
			return "CW";
		case "PH":
		case "SSB":
			return "SSB";
		case "FM":
			return "FM";
		case "RY":
		case "DG":
		case "DIGI":
			return "DIGI";
		default:
			return null;
	}
}

type QsoLineResult =
	| { ok: true; qso: CabrilloQso }
	| { ok: false; error: CabrilloParseError }
	| { ok: false; error: null };

function parseQsoLine(line: string, lineNumber: number): QsoLineResult {
	const parts = line.slice(4).trim().split(FIELD_SPLIT_RE);

	// spec requires: freq mo date time mycall rst myexch dxcall rst theirexch [t]
	if (parts.length < 10) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "malformedLine" },
		};
	}

	const [
		freqStr,
		modeStr,
		date,
		time,
		mycallRaw,
		,
		mySquareRaw,
		dxCall,
		,
		theirSquareRaw,
	] = parts;

	const band = parseBand(freqStr ?? "");
	if (!band) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "invalidBand" },
		};
	}

	const mode = mapMode(modeStr ?? "");
	if (!mode) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "invalidMode" },
		};
	}

	if (!(date && time && mycallRaw && dxCall)) {
		return { ok: false, error: null };
	}

	const mycall = mycallRaw.toUpperCase();
	if (!CALLSIGN_RE.test(mycall)) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "invalidCallsign" },
		};
	}

	const dxCallUpper = dxCall.toUpperCase();
	if (!CALLSIGN_RE.test(dxCallUpper)) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "invalidCallsign" },
		};
	}

	const mySquare = (mySquareRaw ?? "").toUpperCase();
	if (!WAL_SQUARE_RE.test(mySquare)) {
		return {
			ok: false,
			error: { lineNumber, rawLine: line, reason: "invalidSquare" },
		};
	}

	const rawTheirSquare = (theirSquareRaw ?? "").toUpperCase();
	const contactSquare =
		rawTheirSquare && WAL_SQUARE_RE.test(rawTheirSquare)
			? rawTheirSquare
			: null;

	return {
		ok: true,
		qso: {
			lineNumber,
			rawLine: line,
			mycall,
			contactCallsign: dxCallUpper,
			band,
			mode,
			qsoDate: date,
			qsoTime: time,
			operatorSquare: mySquare,
			contactSquare,
		},
	};
}

export function parseCabrillo(content: string): CabrilloParseResult {
	const lines = content.split(LINE_SPLIT_RE);
	let callsign: string | null = null;
	let contest: string | null = null;
	const qsos: CabrilloQso[] = [];
	const parseErrors: CabrilloParseError[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = (lines[i] ?? "").trim();
		const lineNumber = i + 1;
		const upper = line.toUpperCase();

		if (upper.startsWith("CALLSIGN:")) {
			callsign = line.slice("CALLSIGN:".length).trim().toUpperCase() || null;
			continue;
		}

		if (upper.startsWith("CONTEST:")) {
			contest = line.slice("CONTEST:".length).trim().toUpperCase() || null;
			continue;
		}

		if (!upper.startsWith("QSO:")) {
			continue;
		}

		const result = parseQsoLine(line, lineNumber);
		if (result.ok) {
			qsos.push(result.qso);
		} else if (result.error) {
			parseErrors.push(result.error);
		}
	}

	return { callsign, contest, qsos, parseErrors };
}

export function parseCabrilloDateTime(date: string, time: string): Date | null {
	if (!DATE_RE.test(date)) {
		return null;
	}
	if (!TIME_RE.test(time)) {
		return null;
	}
	const iso = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}
