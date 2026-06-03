import { parseAdif } from "./adif";
import { parseCabrillo } from "./cabrillo";
import { detectLogFormat } from "./detect";
import type { DraftQso, ParseResult } from "./types.ts";

// biome-ignore lint/performance/noBarrelFile: single public entrypoint for the package
export { parseAdif, parseAdifDateTime } from "./adif";
export {
	freqToBand,
	parseAdifBand,
	parseCabrilloBand,
	WAL_BAND_NAMES,
} from "./bands";
export {
	parseCabrillo,
	parseCabrilloDateTime,
} from "./cabrillo";
export { detectLogFormat } from "./detect";
export { mapMode } from "./modes";
export type {
	DraftQso,
	LogFormat,
	LogMode,
	ParseResult,
	SkipReason,
} from "./types";

function compareByTime(a: DraftQso, b: DraftQso): number {
	if (a.qsoAt && b.qsoAt) {
		return a.qsoAt.localeCompare(b.qsoAt);
	}
	if (a.qsoAt) {
		return -1;
	}
	if (b.qsoAt) {
		return 1;
	}
	return a.index - b.index;
}

/** Auto-detect the format, parse leniently, and return time-sorted drafts. */
export function parseLog(content: string): ParseResult {
	const format = detectLogFormat(content);
	const { stationCallsign, qsos } =
		format === "adif" ? parseAdif(content) : parseCabrillo(content);

	return {
		format,
		stationCallsign,
		qsos: [...qsos].sort(compareByTime),
	};
}
