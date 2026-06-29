import { user } from "@WAL-GO/db/schema/auth";
import { qso } from "@WAL-GO/db/schema/qsos";
import {
	squareControlHistory,
	squareScore,
	userSeasonScore,
} from "@WAL-GO/db/schema/scoring";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import {
	and,
	asc,
	count,
	countDistinct,
	desc,
	eq,
	gte,
	isNotNull,
	sql,
} from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
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

const individualStandings = protectedProcedure
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
			.where(
				and(eq(userSeasonScore.seasonId, seasonId), eq(user.banned, false))
			)
			.orderBy(desc(userSeasonScore.points));

		const activityRows = await context.db
			.select({
				userId: qso.userId,
				qsoCount: count(),
				squaresWorked: countDistinct(qso.operatorSquare),
			})
			.from(qso)
			.innerJoin(user, eq(user.id, qso.userId))
			.where(and(eq(qso.seasonId, seasonId), eq(user.banned, false)))
			.groupBy(qso.userId);

		const activityByUser = new Map(
			activityRows.map((row) => [
				row.userId,
				{ qsoCount: row.qsoCount, squaresWorked: row.squaresWorked },
			])
		);

		return rows.map((row) => ({
			...row,
			qsoCount: activityByUser.get(row.userId)?.qsoCount ?? 0,
			squaresWorked: activityByUser.get(row.userId)?.squaresWorked ?? 0,
		}));
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

const activityFeedInput = z.object({
	seasonId: z.number().int().positive().optional(),
	limit: z.number().int().positive().max(50).default(30),
});

const activityFeed = publicProcedure
	.input(activityFeedInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				id: squareControlHistory.id,
				squareCode: squareControlHistory.squareCode,
				before: squareControlHistory.beforeTeam,
				after: squareControlHistory.afterTeam,
				at: squareControlHistory.createdAt,
			})
			.from(squareControlHistory)
			.where(eq(squareControlHistory.seasonId, seasonId))
			.orderBy(desc(squareControlHistory.createdAt))
			.limit(input.limit);

		return rows;
	});

const controlTimeline = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const [seasonRow] = await context.db
			.select({ startsAt: season.startsAt })
			.from(season)
			.where(eq(season.id, seasonId))
			.limit(1);

		const events = await context.db
			.select({
				before: squareControlHistory.beforeTeam,
				after: squareControlHistory.afterTeam,
				at: squareControlHistory.createdAt,
			})
			.from(squareControlHistory)
			.where(eq(squareControlHistory.seasonId, seasonId))
			.orderBy(asc(squareControlHistory.createdAt));

		const counts: Record<Team, number> = { yellow: 0, green: 0, red: 0 };
		const byTime = new Map<
			number,
			{ at: Date; yellow: number; green: number; red: number }
		>();

		if (seasonRow) {
			byTime.set(seasonRow.startsAt.getTime(), {
				at: seasonRow.startsAt,
				yellow: 0,
				green: 0,
				red: 0,
			});
		}

		for (const event of events) {
			if (event.before) {
				counts[event.before] -= 1;
			}
			if (event.after) {
				counts[event.after] += 1;
			}
			byTime.set(event.at.getTime(), { at: event.at, ...counts });
		}

		return [...byTime.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
	});

const RECENT_ACTIVITY_HOURS = 2;

const recentSquares = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.selectDistinctOn([qso.operatorSquare], {
				squareCode: qso.operatorSquare,
				team: seasonMembership.team,
			})
			.from(qso)
			.innerJoin(user, eq(user.id, qso.userId))
			.innerJoin(
				seasonMembership,
				and(
					eq(seasonMembership.userId, qso.userId),
					eq(seasonMembership.seasonId, qso.seasonId)
				)
			)
			.where(
				and(
					eq(qso.seasonId, seasonId),
					eq(user.banned, false),
					gte(
						qso.qsoAt,
						sql`now() - make_interval(hours => ${RECENT_ACTIVITY_HOURS})`
					)
				)
			)
			.orderBy(qso.operatorSquare, desc(qso.qsoAt));

		return rows;
	});

const RECENT_CONTACT_LINES_LIMIT = 100;

// Anonymized operator→contact square pairs for the map lines (no callsign/user id).
const recentContactLines = publicProcedure
	.input(scoringInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				operatorSquare: qso.operatorSquare,
				contactSquare: qso.contactSquare,
				team: seasonMembership.team,
			})
			.from(qso)
			.innerJoin(user, eq(user.id, qso.userId))
			.innerJoin(
				seasonMembership,
				and(
					eq(seasonMembership.userId, qso.userId),
					eq(seasonMembership.seasonId, qso.seasonId)
				)
			)
			.where(
				and(
					eq(qso.seasonId, seasonId),
					eq(user.banned, false),
					isNotNull(qso.contactSquare),
					gte(
						qso.qsoAt,
						sql`now() - make_interval(hours => ${RECENT_ACTIVITY_HOURS})`
					)
				)
			)
			.orderBy(desc(qso.qsoAt))
			.limit(RECENT_CONTACT_LINES_LIMIT);

		return rows;
	});

const recentSquareActivityInput = z.object({
	seasonId: z.number().int().positive().optional(),
	squareCode: z.string().min(1),
});

const recentSquareActivity = publicProcedure
	.input(recentSquareActivityInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				band: qso.band,
				mode: qso.mode,
				qsoCount: count(),
			})
			.from(qso)
			.innerJoin(user, eq(user.id, qso.userId))
			.where(
				and(
					eq(qso.seasonId, seasonId),
					eq(qso.operatorSquare, input.squareCode),
					eq(user.banned, false),
					gte(
						qso.qsoAt,
						sql`now() - make_interval(hours => ${RECENT_ACTIVITY_HOURS})`
					)
				)
			)
			.groupBy(qso.band, qso.mode)
			.orderBy(desc(count()));

		return rows;
	});

const RECENT_CONTACTS_LIMIT = 12;

const recentSquareContacts = protectedProcedure
	.input(recentSquareActivityInput)
	.handler(async ({ context, input }) => {
		const seasonId = await resolveSeasonId(context.db, input.seasonId);
		if (seasonId === null) {
			return [];
		}

		const rows = await context.db
			.select({
				userId: qso.userId,
				callsign: user.name,
				team: seasonMembership.team,
				band: qso.band,
				mode: qso.mode,
				qsoAt: qso.qsoAt,
			})
			.from(qso)
			.innerJoin(user, eq(user.id, qso.userId))
			.innerJoin(
				seasonMembership,
				and(
					eq(seasonMembership.userId, qso.userId),
					eq(seasonMembership.seasonId, qso.seasonId)
				)
			)
			.where(
				and(
					eq(qso.seasonId, seasonId),
					eq(qso.operatorSquare, input.squareCode),
					eq(user.banned, false),
					gte(
						qso.qsoAt,
						sql`now() - make_interval(hours => ${RECENT_ACTIVITY_HOURS})`
					)
				)
			)
			.orderBy(desc(qso.qsoAt))
			.limit(RECENT_CONTACTS_LIMIT);

		return rows;
	});

export const scoringRouter = {
	squares,
	individualStandings,
	teamStandings,
	controlTimeline,
	activityFeed,
	recentSquares,
	recentSquareActivity,
	recentSquareContacts,
	recentContactLines,
};
