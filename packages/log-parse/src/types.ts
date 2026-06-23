export type LogFormat = "adif" | "cabrillo";

export type LogMode = "CW" | "DIGI" | "FM" | "SSB";

/**
 * Full skip-reason vocabulary shared across parsing and commit. `log-parse`
 * only emits the structural subset (invalidBand, invalidCallsign, invalidDate,
 * invalidMode, malformedLine). The remaining reasons are decided by the commit
 * endpoint (context- and database-dependent) or by the review dialog
 * (square validity).
 */
export type SkipReason =
	| "blockedCallsign"
	| "callsignMismatch"
	| "dxForLithuanian"
	| "exactDuplicate"
	| "gameDuplicate"
	| "invalidBand"
	| "invalidCallsign"
	| "invalidDate"
	| "invalidMode"
	| "invalidSquare"
	| "malformedLine"
	| "missingContactSquare"
	| "outsideSeason"
	| "selfContact";

/**
 * A single parsed QSO, kept deliberately lenient: squares are returned raw
 * (never dropped or nulled) so the review dialog can let the user fix them.
 * `issues` carries only structural problems that square editing cannot fix.
 */
export interface DraftQso {
	band: string | null;
	contactCallsign: string;
	contactSquare: string;
	/** Stable client id — line number (Cabrillo) or record index (ADIF). */
	index: number;
	issues: SkipReason[];
	mode: LogMode | null;
	/** The operator (own) callsign on the QSO, for the station-callsign check. */
	operatorCallsign: string;
	operatorSquare: string;
	/** ISO 8601 UTC, or null when the date/time could not be parsed. */
	qsoAt: string | null;
	/** Source line / record text, used for the upload audit record. */
	raw: string;
}

export interface ParseResult {
	format: LogFormat;
	/** Draft QSOs sorted by time (rows with no parseable time sort last). */
	qsos: DraftQso[];
	/** Station callsign from the log header, when present. */
	stationCallsign: string | null;
}
