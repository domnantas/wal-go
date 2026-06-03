import type { LogMode } from "./types";

/**
 * Maps Cabrillo and ADIF mode/submode strings to the four WAL game modes.
 * Unknown values return null (emitted as an `invalidMode` issue).
 */
export function mapMode(raw: string): LogMode | null {
	switch (raw.trim().toUpperCase()) {
		case "CW":
			return "CW";
		case "PH":
		case "SSB":
		case "USB":
		case "LSB":
			return "SSB";
		case "FM":
			return "FM";
		case "RY":
		case "DG":
		case "DIGI":
		case "DATA":
		case "RTTY":
		case "PSK":
		case "PSK31":
		case "PSK63":
		case "FT8":
		case "FT4":
		case "JT65":
		case "JT9":
		case "MFSK":
		case "FSK441":
		case "OLIVIA":
		case "CONTESTI":
		case "JS8":
		case "Q65":
			return "DIGI";
		default:
			return null;
	}
}
