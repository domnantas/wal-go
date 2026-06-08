import { describe, expect, it } from "vitest";
import { parseCabrillo, parseCabrilloDateTime } from "./cabrillo";

const HEADER = "START-OF-LOG: 3.0\nCALLSIGN: LY2EN\nCONTEST: LY-WAL\n";

describe("parseCabrilloDateTime", () => {
	it("builds an ISO UTC timestamp", () => {
		expect(parseCabrilloDateTime("2026-06-01", "1200")).toBe(
			"2026-06-01T12:00:00.000Z"
		);
	});

	it("rejects malformed date/time", () => {
		expect(parseCabrilloDateTime("2026/06/01", "1200")).toBeNull();
		expect(parseCabrilloDateTime("2026-06-01", "12:00")).toBeNull();
	});
});

describe("parseCabrillo", () => {
	it("reads the station callsign from the header", () => {
		const { stationCallsign } = parseCabrillo(HEADER);
		expect(stationCallsign).toBe("LY2EN");
	});

	it("parses a valid QSO line with both squares", () => {
		const { qsos } = parseCabrillo(
			`${HEADER}QSO: 14000 CW 2026-06-01 1200 LY2EN 599 A05 LY3AB 599 B12\n`
		);
		expect(qsos).toHaveLength(1);
		expect(qsos[0]).toMatchObject({
			band: "20m",
			mode: "CW",
			operatorCallsign: "LY2EN",
			contactCallsign: "LY3AB",
			operatorSquare: "A05",
			contactSquare: "B12",
			qsoAt: "2026-06-01T12:00:00.000Z",
			issues: [],
		});
	});

	it("keeps an invalid operator square raw instead of dropping the row", () => {
		const { qsos } = parseCabrillo(
			`${HEADER}QSO: 14000 CW 2026-06-01 1200 LY2EN 599 ZZ9 LY3AB 599 B12\n`
		);
		expect(qsos).toHaveLength(1);
		expect(qsos[0]?.operatorSquare).toBe("ZZ9");
		// Square validity is decided downstream, not flagged as a structural issue.
		expect(qsos[0]?.issues).toEqual([]);
	});

	it("keeps a missing contact square as empty without an issue", () => {
		const { qsos } = parseCabrillo(
			`${HEADER}QSO: 14000 CW 2026-06-01 1200 LY2EN 599 A05 LY3AB 599\n`
		);
		expect(qsos[0]).toMatchObject({
			operatorCallsign: "LY2EN",
			contactCallsign: "LY3AB",
			operatorSquare: "A05",
			contactSquare: "",
			issues: [],
		});
	});

	it("keeps callsigns aligned when the operator square is missing", () => {
		// No operator square: the RST (599) must not be mistaken for the dxcall.
		const { qsos } = parseCabrillo(
			`${HEADER}QSO: 14000 CW 2026-06-01 1200 LY2EN 599 LY3AB 599 B12\n`
		);
		expect(qsos[0]).toMatchObject({
			operatorCallsign: "LY2EN",
			contactCallsign: "LY3AB",
			operatorSquare: "",
			contactSquare: "B12",
			issues: [],
		});
	});

	it("falls back to the GRID-LOCATOR header when a row has no operator square", () => {
		const { qsos } = parseCabrillo(
			"START-OF-LOG: 3.0\nCALLSIGN: LY1JA\nGRID-LOCATOR: KO24PR\nQSO: 14222 PH 2026-06-05 1431 LY1JA 59 2E0VSS 59\n"
		);
		expect(qsos[0]).toMatchObject({
			operatorCallsign: "LY1JA",
			contactCallsign: "2E0VSS",
			operatorSquare: "K26",
			issues: [],
		});
	});

	it("prefers an explicit per-row operator square over the header locator", () => {
		const { qsos } = parseCabrillo(
			"START-OF-LOG: 3.0\nGRID-LOCATOR: KO24PR\nQSO: 14000 CW 2026-06-01 1200 LY2EN 599 A05 LY3AB 599 B12\n"
		);
		expect(qsos[0]?.operatorSquare).toBe("A05");
	});

	it("flags an unmappable band", () => {
		const { qsos } = parseCabrillo(
			`${HEADER}QSO: 99999 CW 2026-06-01 1200 LY2EN 599 A05 LY3AB 599 B12\n`
		);
		expect(qsos[0]?.band).toBeNull();
		expect(qsos[0]?.issues).toContain("invalidBand");
	});
});
