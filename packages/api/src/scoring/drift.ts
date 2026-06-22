import type { createDb } from "@WAL-GO/db";
import { squareScore, userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { season } from "@WAL-GO/db/schema/seasons";

import { getScoringRuleSet } from "./index";

type Db = Awaited<ReturnType<typeof createDb>>;

export interface SeasonDrift {
	hasDrift: boolean;
	// Stored minus expected user points (positive => stored is too high).
	pointDifference: number;
	// Number of (square, team) keys where stored points !== expected points.
	squareMismatches: number;
	// Number of users where stored season points !== expected points.
	userMismatches: number;
}

export const EMPTY_SEASON_DRIFT: SeasonDrift = {
	squareMismatches: 0,
	userMismatches: 0,
	pointDifference: 0,
	hasDrift: false,
};

const KEY_SEPARATOR = "|";

function squareKey(seasonId: number, squareCode: string, team: string) {
	return `${seasonId}${KEY_SEPARATOR}${squareCode}${KEY_SEPARATOR}${team}`;
}

function userKey(seasonId: number, userId: string) {
	return `${seasonId}${KEY_SEPARATOR}${userId}`;
}

function countSquareMismatches(
	seasonId: number,
	expectedSquareMap: Map<string, number>,
	storedSquareMap: Map<string, number>
): number {
	const prefix = `${seasonId}${KEY_SEPARATOR}`;
	const keys = new Set([
		...expectedSquareMap.keys(),
		...[...storedSquareMap.keys()].filter((k) => k.startsWith(prefix)),
	]);
	let mismatches = 0;
	for (const key of keys) {
		if ((expectedSquareMap.get(key) ?? 0) !== (storedSquareMap.get(key) ?? 0)) {
			mismatches += 1;
		}
	}
	return mismatches;
}

function computeUserDrift(
	seasonId: number,
	expectedUserMap: Map<string, number>,
	storedUserMap: Map<string, number>
): Pick<SeasonDrift, "userMismatches" | "pointDifference"> {
	const prefix = `${seasonId}${KEY_SEPARATOR}`;
	const keys = new Set([
		...expectedUserMap.keys(),
		...[...storedUserMap.keys()].filter((k) => k.startsWith(prefix)),
	]);
	let userMismatches = 0;
	let pointDifference = 0;
	for (const key of keys) {
		const exp = expectedUserMap.get(key) ?? 0;
		const stored = storedUserMap.get(key) ?? 0;
		if (exp !== stored) {
			userMismatches += 1;
			pointDifference += stored - exp;
		}
	}
	return { userMismatches, pointDifference };
}

export async function computeScoreDrift(
	db: Db
): Promise<Map<number, SeasonDrift>> {
	const [seasonRows, storedSquares, storedUsers] = await Promise.all([
		db
			.select({ id: season.id, scoringRuleSet: season.scoringRuleSet })
			.from(season),
		db
			.select({
				seasonId: squareScore.seasonId,
				squareCode: squareScore.squareCode,
				team: squareScore.team,
				points: squareScore.points,
			})
			.from(squareScore),
		db
			.select({
				seasonId: userSeasonScore.seasonId,
				userId: userSeasonScore.userId,
				points: userSeasonScore.points,
			})
			.from(userSeasonScore),
	]);

	const storedSquareMap = new Map<string, number>();
	for (const row of storedSquares) {
		storedSquareMap.set(
			squareKey(row.seasonId, row.squareCode, row.team),
			row.points
		);
	}

	const storedUserMap = new Map<string, number>();
	for (const row of storedUsers) {
		storedUserMap.set(userKey(row.seasonId, row.userId), row.points);
	}

	const drift = new Map<number, SeasonDrift>();
	for (const s of seasonRows) {
		const ruleSet = getScoringRuleSet(s.scoringRuleSet);
		const expected = await ruleSet.computeExpectedScores(db, s.id);

		const expectedSquareMap = new Map<string, number>();
		for (const row of expected.squareScores) {
			expectedSquareMap.set(
				squareKey(s.id, row.squareCode, row.team),
				row.points
			);
		}

		const expectedUserMap = new Map<string, number>();
		for (const row of expected.userScores) {
			expectedUserMap.set(userKey(s.id, row.userId), row.points);
		}

		const squareMismatches = countSquareMismatches(
			s.id,
			expectedSquareMap,
			storedSquareMap
		);
		const { userMismatches, pointDifference } = computeUserDrift(
			s.id,
			expectedUserMap,
			storedUserMap
		);
		drift.set(s.id, {
			squareMismatches,
			userMismatches,
			pointDifference,
			hasDrift: squareMismatches > 0 || userMismatches > 0,
		});
	}

	return drift;
}
