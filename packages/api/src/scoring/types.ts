import type { createDb } from "@WAL-GO/db";

type Db = ReturnType<typeof createDb>;
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
	operatorSquare: string;
	qsoAt: Date;
	seasonId: number;
	team: "yellow" | "green" | "red";
	userId: string;
}

export interface DeleteParams {
	contactSquare: string | null;
	operatorSquare: string;
	team: "yellow" | "green" | "red";
	userId: string;
}

export interface ScoringRuleSet {
	filterBulkInserts(tx: Tx, params: InsertParams[]): Promise<InsertParams[]>;
	scoreBulkInsert(params: InsertParams[]): ScoreDelta[];
	scoreDelete(tx: Tx, params: DeleteParams): Promise<ScoreDelta[]>;
	scoreInsert(tx: Tx, params: InsertParams): Promise<ScoreDelta[]>;
	validateInsert(tx: Tx, params: InsertParams): Promise<void>;
}
