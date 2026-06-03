import type { LogFormat } from "./types";

const ADIF_MARKERS = ["<eor>", "<eoh>", "<call:"];

/** Detect whether log content is ADIF or Cabrillo. Defaults to Cabrillo. */
export function detectLogFormat(content: string): LogFormat {
	const lower = content.toLowerCase();
	if (ADIF_MARKERS.some((marker) => lower.includes(marker))) {
		return "adif";
	}
	return "cabrillo";
}
