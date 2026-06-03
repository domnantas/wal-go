export const CALLSIGN_REGEX = /^([A-Z]\d|[A-Z]{1,2}|\d[A-Z])\d+[A-Z]+$/;

export const BLOCKED_CALLSIGN_REGEX =
	/^(D[01]|U[0-4]|U6|U7|U9|UA|UB|UC|UD|UE|UF|UG|UH|UI|R|EU|EV|EW)/i;

export function normalizeCallsign(callsign: string): string {
	const parts = callsign.trim().toUpperCase().split("/");
	return parts.reduce((a, b) => (a.length >= b.length ? a : b), "");
}

export function isBlockedCallsign(callsign: string): boolean {
	return BLOCKED_CALLSIGN_REGEX.test(callsign);
}

/**
 * Whether a callsign has a plausible amateur-radio shape (prefix + digit +
 * suffix). Checks the normalized base call, so operating suffixes/prefixes like
 * `/P` or `9A/` are stripped before validation. This is the same rule used for
 * account callsigns at sign-up.
 */
export function isValidCallsign(callsign: string): boolean {
	return CALLSIGN_REGEX.test(normalizeCallsign(callsign));
}
