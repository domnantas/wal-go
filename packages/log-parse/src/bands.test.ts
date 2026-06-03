import { QSO_BANDS } from "@WAL-GO/db/schema/qsos";
import { describe, expect, it } from "vitest";
import { parseAdifBand, parseCabrilloBand, WAL_BAND_NAMES } from "./bands";

describe("WAL_BAND_NAMES", () => {
	it("stays a subset of the QSO_BANDS database enum", () => {
		const dbBands = new Set<string>(QSO_BANDS);
		for (const band of WAL_BAND_NAMES) {
			expect(dbBands.has(band)).toBe(true);
		}
	});
});

describe("parseCabrilloBand", () => {
	it("maps a kHz frequency to a band", () => {
		expect(parseCabrilloBand("14000")).toBe("20m");
	});

	it("maps a VHF designator", () => {
		expect(parseCabrilloBand("144")).toBe("2m");
	});

	it("maps a microwave G-suffix designator", () => {
		expect(parseCabrilloBand("1.2G")).toBe("23cm");
	});

	it("returns null for an out-of-range frequency", () => {
		expect(parseCabrilloBand("99999")).toBeNull();
	});
});

describe("parseAdifBand", () => {
	it("accepts a direct band string", () => {
		expect(parseAdifBand("20m", undefined)).toBe("20m");
	});

	it("prefers FREQ (MHz) when present", () => {
		expect(parseAdifBand(undefined, "14.074")).toBe("20m");
	});

	it("returns null for an unknown band", () => {
		expect(parseAdifBand("20cm", undefined)).toBeNull();
	});
});
