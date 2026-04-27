const WAL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const WAL_GRID_STEP_DEGREES = 10 / 60;
export const WAL_GRID_START_LONGITUDE = 20 + 50 / 60;
export const WAL_GRID_START_LATITUDE = 53 + 50 / 60;
export const WAL_GRID_END_LONGITUDE = 27;
export const WAL_GRID_END_LATITUDE = 56 + 20 / 60;
export const WAL_LATITUDE_ORIGIN = 56 + 30 / 60;

export const VALID_WAL_RANGES = {
	A: [
		[5, 18],
		[22, 24],
	],
	B: [[2, 26]],
	C: [[1, 30]],
	D: [[1, 32]],
	E: [[1, 34]],
	F: [[1, 34]],
	G: [[0, 35]],
	H: [[0, 36]],
	I: [[5, 35]],
	J: [[10, 32]],
	K: [[11, 29]],
	L: [[11, 29]],
	M: [[11, 28]],
	N: [[13, 29]],
	O: [
		[15, 25],
		[28, 29],
	],
	P: [[15, 23]],
} satisfies Record<string, [number, number][]>;

export function calculateWal(latitude: number, longitude: number) {
	const letterIndex = Math.floor(
		-(latitude - WAL_LATITUDE_ORIGIN) / WAL_GRID_STEP_DEGREES
	);
	const letter = WAL_LETTERS.charAt(letterIndex);
	const number = Math.floor(
		(longitude - WAL_GRID_START_LONGITUDE) / WAL_GRID_STEP_DEGREES
	);
	return `${letter}${number.toString().padStart(2, "0")}`;
}

export function createValidWalSet() {
	const validWal = new Set<string>();
	for (const [letter, ranges] of Object.entries(VALID_WAL_RANGES)) {
		for (const [start, end] of ranges) {
			for (let number = start; number <= end; number += 1) {
				validWal.add(`${letter}${number.toString().padStart(2, "0")}`);
			}
		}
	}
	return validWal;
}

export const VALID_WAL_SQUARES = createValidWalSet();

export function normalizeWalSquare(value: string) {
	return value.trim().toUpperCase();
}

export function isValidWalSquare(value: string) {
	return VALID_WAL_SQUARES.has(normalizeWalSquare(value));
}
