import { user } from "@WAL-GO/db/schema/auth";
import { squareScore, userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { seasonMembership } from "@WAL-GO/db/schema/seasons";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";
import { computeLeader, TEAMS, type Team } from "../scoring/control";
import { getCurrentSeason } from "./seasons";

const scoringInput = z.object({
	seasonId: z.number().int().positive().optional(),
});

async function resolveSeasonId(
	db: Parameters<typeof getCurrentSeason>[0],
	seasonId: number | undefined
): Promise<number | null> {
	if (seasonId !== undefined) {
		return seasonId;
	}
	const current = await getCurrentSeason(db);
	return current?.id ?? null;
}

const squares = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				squareCode: squareScore.squareCode,
				team: squareScore.team,
				points: squareScore.points,
			})
			.from(squareScore)
			.where(eq(squareScore.seasonId, seasonId));

		const squareMap = new Map<
			string,
			{ yellow: number; green: number; red: number }
		>();
		for (const row of rows) {
			if (!squareMap.has(row.squareCode)) {
				squareMap.set(row.squareCode, { yellow: 0, green: 0, red: 0 });
			}
			const sq = squareMap.get(row.squareCode);
			if (sq) {
				sq[row.team] = row.points;
			}
		}

		return [...squareMap.entries()].map(([code, scores]) => ({
			code,
			scores,
		}));
	});

const individualStandings = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				userId: userSeasonScore.userId,
				callsign: user.name,
				team: seasonMembership.team,
				points: userSeasonScore.points,
			})
			.from(userSeasonScore)
			.innerJoin(user, eq(user.id, userSeasonScore.userId))
			.innerJoin(
				seasonMembership,
				and(
					eq(seasonMembership.userId, userSeasonScore.userId),
					eq(seasonMembership.seasonId, userSeasonScore.seasonId)
				)
			)
			.where(eq(userSeasonScore.seasonId, seasonId))
			.orderBy(desc(userSeasonScore.points));

		return rows;
	});

const teamStandings = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return TEAMS.map((team) => ({ team, points: 0, squaresControlled: 0 }));
		}

		const rows = await context.db
			.select()
			.from(squareScore)
			.where(eq(squareScore.seasonId, seasonId));

		const totals: Record<Team, { points: number; squaresControlled: number }> =
			{
				yellow: { points: 0, squaresControlled: 0 },
				green: { points: 0, squaresControlled: 0 },
				red: { points: 0, squaresControlled: 0 },
			};

		const bySquare = new Map<string, Record<Team, number>>();
		for (const row of rows) {
			if (!bySquare.has(row.squareCode)) {
				bySquare.set(row.squareCode, { yellow: 0, green: 0, red: 0 });
			}
			const sq = bySquare.get(row.squareCode);
			if (sq) {
				sq[row.team] = row.points;
			}
			totals[row.team].points += row.points;
		}

		for (const [, scores] of bySquare) {
			const leader = computeLeader(scores);
			if (leader) {
				totals[leader].squaresControlled += 1;
			}
		}

		return TEAMS.map((team) => ({ team, ...totals[team] })).sort(
			(a, b) => b.squaresControlled - a.squaresControlled || b.points - a.points
		);
	});

export const scoringRouter = {
	squares,
	individualStandings,
	teamStandings,
};
