/**
 * Band names recognised by `log-parse`. Kept as a local constant to avoid a
 * dependency on `@WAL-GO/db`; a test asserts this stays a subset of the
 * `QSO_BANDS` database enum so the two cannot silently drift. The commit
 * endpoint is the authoritative gatekeeper against `QSO_BANDS`.
 */
export const WAL_BAND_NAMES = [
	"160m",
	"80m",
	"60m",
	"40m",
	"30m",
	"20m",
	"17m",
	"15m",
	"12m",
	"10m",
	"6m",
	"4m",
	"2m",
	"70cm",
	"23cm",
	"13cm",
	"9cm",
	"6cm",
	"3cm",
	"12mm",
	"6mm",
	"4mm",
	"2.5mm",
	"2mm",
	"1mm",
] as const;

const WAL_BAND_SET = new Set<string>(WAL_BAND_NAMES);

// Frequency ranges in kHz mapped to band names.
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
	[1_240_000, 1_300_000, "23cm"],
	[2_300_000, 2_450_000, "13cm"],
	[3_300_000, 3_500_000, "9cm"],
	[5_650_000, 5_850_000, "6cm"],
	[10_000_000, 10_500_000, "3cm"],
];

// Cabrillo v3 band designators: VHF/UHF in MHz and microwave G-suffix strings.
const BAND_DESIGNATOR_MAP: Record<string, string> = {
	"50": "6m",
	"70": "4m",
	"144": "2m",
	"432": "70cm",
	"1.2G": "23cm",
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

export function freqToBand(freqKhz: number): string | null {
	for (const [lo, hi, bandName] of FREQ_RANGES) {
		if (freqKhz >= lo && freqKhz <= hi) {
			return bandName;
		}
	}
	return null;
}

/** Resolve a Cabrillo frequency/band-designator field to a band name. */
export function parseCabrilloBand(freqStr: string): string | null {
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

/** Resolve an ADIF record's BAND/FREQ fields to a band name. */
export function parseAdifBand(
	bandField: string | undefined,
	freqMhzField: string | undefined
): string | null {
	const freqMhz = freqMhzField ? Number.parseFloat(freqMhzField) : Number.NaN;
	if (!Number.isNaN(freqMhz)) {
		const byFreq = freqToBand(Math.round(freqMhz * 1000));
		if (byFreq) {
			return byFreq;
		}
	}
	const band = (bandField ?? "").trim().toLowerCase();
	return WAL_BAND_SET.has(band) ? band : null;
}
