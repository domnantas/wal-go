import type { createDb } from "@WAL-GO/db";

type Db = Awaited<ReturnType<typeof createDb>>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface ScoreDelta {
	pointsDelta: number;
	squareCode: string;
	team: "yellow" | "green" | "red";
	userId: string;
}

export interface InsertParams {
	band: string;
	contactCallsign: string;
	contactSquare: string | null;
	mode: string;
	operatorCallsign: string;
	operatorSquare: string;
	qsoAt: Date;
	seasonId: number;
	team: "yellow" | "green" | "red";
	userId: string;
}

export interface DeleteParams {
	band: string;
	contactCallsign: string;
	contactSquare: string | null;
	mode: string;
	operatorCallsign: string;
	operatorSquare: string;
	qsoAt: Date;
	qsoId: number;
	seasonId: number;
	team: "yellow" | "green" | "red";
	userId: string;
}

export interface QsoScore {
	confirmed: boolean;
	points: number;
}

export interface ExpectedScores {
	squareScores: Array<{
		squareCode: string;
		team: "yellow" | "green" | "red";
		points: number;
	}>;
	userScores: Array<{ userId: string; points: number }>;
}

export interface ScoringRuleSet {
	computeExpectedScores(db: Db, seasonId: number): Promise<ExpectedScores>;
	filterBulkInserts(tx: Tx, params: InsertParams[]): Promise<InsertParams[]>;
	/** When true, a non-empty contact square (WAL square or "DX") is mandatory. */
	requiresContactSquare: boolean;
	scoreBulkInsert(params: InsertParams[]): ScoreDelta[];
	scoreDelete(tx: Tx, params: DeleteParams): Promise<ScoreDelta[]>;
	scoreInsert(tx: Tx, params: InsertParams): Promise<ScoreDelta[]>;
	/** Per-QSO score for every QSO in a season, keyed by QSO id. */
	scoreSeasonQsos(db: Db, seasonId: number): Promise<Map<number, QsoScore>>;
	usePerQsoScoring: boolean;
	validateInsert(
		tx: Tx,
		params: InsertParams,
		options?: { excludeQsoId?: number }
	): Promise<void>;
}
