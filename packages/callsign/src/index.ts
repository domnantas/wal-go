export const CALLSIGN_REGEX = /^[A-Z0-9]{1,3}\d[A-Z]{1,5}$/;

export const BLOCKED_CALLSIGN_REGEX =
	/^(D[01]|U1|UA|UB|UC|UD|UE|UF|UG|UH|UI|R|EU|EV|EW)/i;

export function normalizeCallsign(callsign: string): string {
	const parts = callsign.trim().toUpperCase().split("/");
	return parts.reduce((a, b) => (a.length >= b.length ? a : b), "");
}

export function isBlockedCallsign(callsign: string): boolean {
	return BLOCKED_CALLSIGN_REGEX.test(callsign);
}
