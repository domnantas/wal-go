import { describe, expect, it } from "vitest";
import { detectLogFormat } from "./detect";

describe("detectLogFormat", () => {
	it("detects ADIF by <eor> marker", () => {
		expect(detectLogFormat("<CALL:5>LY2EN <EOR>")).toBe("adif");
	});

	it("detects ADIF by header <eoh> marker", () => {
		expect(detectLogFormat("Generated\n<EOH>\n")).toBe("adif");
	});

	it("is case-insensitive for ADIF markers", () => {
		expect(detectLogFormat("<call:5>ly2en <eor>")).toBe("adif");
	});

	it("defaults to Cabrillo", () => {
		expect(
			detectLogFormat("START-OF-LOG: 3.0\nQSO: 14000 CW 2026-06-01 1200")
		).toBe("cabrillo");
	});
});
