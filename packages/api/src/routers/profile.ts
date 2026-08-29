import type { createDb } from "@WAL-GO/db";
import { userAchievement, userStat } from "@WAL-GO/db/schema/achievements";
import { user } from "@WAL-GO/db/schema/auth";
import { QSO_BANDS, QSO_MODES, qso } from "@WAL-GO/db/schema/qsos";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import { ORPCError } from "@orpc/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { ACHIEVEMENTS } from "../achievements/definitions";
import { protectedProcedure } from "../index";
import { getCurrentSeason } from "./seasons";

type Db = Awaited<ReturnType<typeof createDb>>;

const RECENT_QSO_LIMIT = 10;

const profileInput = z.object({
	callsign: z.string().min(1).max(32),
});

/**
 * Resolves a callsign to a visible user. Banned operators have no profile —
 * they are already excluded from every standing and aggregate.
 */
async function resolveOperator(db: Db, callsign: string) {
	const rows = await db
		.select({
			id: user.id,
			callsign: user.name,
			image: user.image,
			createdAt: user.createdAt,
			discordUsername: user.discordUsername,
		})
		.from(user)
		.where(
			and(
				eq(sql`upper(${user.name})`, callsign.toUpperCase()),
				eq(user.banned, false)
			)
		)
		.limit(1);

	const operator = rows[0];
	if (!operator) {
		throw new ORPCError("NOT_FOUND", { message: "Operatorius nerastas" });
	}
	return operator;
}

const get = protectedProcedure
	.input(profileInput)
	.handler(async ({ context, input }) => {
		const operator = await resolveOperator(context.db, input.callsign);
		const currentSeason = await getCurrentSeason(
			context.db as Parameters<typeof getCurrentSeason>[0]
		);

		const [statRows, membershipRows] = await Promise.all([
			context.db
				.select({
					seasonId: userStat.seasonId,
					qsoCount: userStat.qsoCount,
					points: userStat.points,
					confirmedCount: userStat.confirmedCount,
					distinctCallsigns: userStat.distinctCallsigns,
					distinctSquares: userStat.distinctSquares,
					activeDays: userStat.activeDays,
					longestStreak: userStat.longestStreak,
					firstQsoAt: userStat.firstQsoAt,
					lastQsoAt: userStat.lastQsoAt,
				})
				.from(userStat)
				.where(eq(userStat.userId, operator.id)),
			context.db
				.select({
					seasonId: seasonMembership.seasonId,
					seasonName: season.name,
					team: seasonMembership.team,
				})
				.from(seasonMembership)
				.innerJoin(season, eq(season.id, seasonMembership.seasonId))
				.where(eq(seasonMembership.userId, operator.id)),
		]);

		const career = statRows.find((row) => row.seasonId === null) ?? null;
		const seasonStat = currentSeason
			? (statRows.find((row) => row.seasonId === currentSeason.id) ?? null)
			: null;
		const membership = currentSeason
			? (membershipRows.find((row) => row.seasonId === currentSeason.id) ??
				null)
			: null;

		return {
			callsign: operator.callsign,
			image: operator.image,
			memberSince: operator.createdAt,
			discordUsername: operator.discordUsername,
			seasonsPlayed: membershipRows.length,
			currentSeason:
				currentSeason && membership
					? {
							id: currentSeason.id,
							name: currentSeason.name,
							team: membership.team,
						}
					: null,
			career,
			seasonStat,
		};
	});

/**
 * Squares this operator has worked: every square career-wide, and the subset
 * worked in the current season. The profile map tints the two differently.
 *
 * Read straight from `qso` — the source of truth. The `(user_id, season_id,
 * qso_at)` index covers the scan, and a career's worth of QSOs dedupes to at
 * most TOTAL_SQUARES codes, so there is nothing here worth materializing.
 */
const squares = protectedProcedure
	.input(profileInput)
	.handler(async ({ context, input }) => {
		const operator = await resolveOperator(context.db, input.callsign);
		const currentSeason = await getCurrentSeason(
			context.db as Parameters<typeof getCurrentSeason>[0]
		);

		const rows = await context.db
			.selectDistinct({
				squareCode: qso.operatorSquare,
				seasonId: qso.seasonId,
			})
			.from(qso)
			.where(eq(qso.userId, operator.id));

		const allTime = [...new Set(rows.map((row) => row.squareCode))].sort();
		const seasonSquares = currentSeason
			? [
					...new Set(
						rows
							.filter((row) => row.seasonId === currentSeason.id)
							.map((row) => row.squareCode)
					),
				].sort()
			: [];

		return { allTime, season: seasonSquares };
	});

const BAND_BY_INDEX = QSO_BANDS;
const MODE_BY_INDEX = QSO_MODES;

/** Band and mode split for the operator, career-wide. */
const distribution = protectedProcedure
	.input(profileInput)
	.handler(async ({ context, input }) => {
		const operator = await resolveOperator(context.db, input.callsign);

		const [bandRows, modeRows] = await Promise.all([
			context.db
				.select({ band: qso.band, total: count() })
				.from(qso)
				.where(eq(qso.userId, operator.id))
				.groupBy(qso.band),
			context.db
				.select({ mode: qso.mode, total: count() })
				.from(qso)
				.where(eq(qso.userId, operator.id))
				.groupBy(qso.mode),
		]);

		return {
			bands: BAND_BY_INDEX.map((band) => ({
				key: band,
				total: bandRows.find((row) => row.band === band)?.total ?? 0,
			})).filter((row) => row.total > 0),
			modes: MODE_BY_INDEX.map((mode) => ({
				key: mode,
				total: modeRows.find((row) => row.mode === mode)?.total ?? 0,
			})).filter((row) => row.total > 0),
		};
	});

const recentQsos = protectedProcedure
	.input(profileInput)
	.handler(async ({ context, input }) => {
		const operator = await resolveOperator(context.db, input.callsign);

		return context.db
			.select({
				id: qso.id,
				contactCallsign: qso.contactCallsign,
				band: qso.band,
				mode: qso.mode,
				operatorSquare: qso.operatorSquare,
				contactSquare: qso.contactSquare,
				qsoAt: qso.qsoAt,
				score: qso.score,
				confirmed: qso.confirmed,
			})
			.from(qso)
			.where(eq(qso.userId, operator.id))
			.orderBy(desc(qso.qsoAt))
			.limit(RECENT_QSO_LIMIT);
	});

interface AchievementRow {
	progress: number;
	unlockedAt: Date | null;
}

/**
 * An unlock always wins over a locked row, whatever the progress. When several
 * seasons unlocked the same achievement, keep the earliest date so the profile
 * consistently shows when it was first earned. Otherwise keep the best locked
 * progress: a catalogue target can grow (`QSO_MODES.length`).
 */
function isBetterRow(
	row: AchievementRow,
	existing: AchievementRow | undefined
) {
	if (!existing) {
		return true;
	}
	if ((row.unlockedAt === null) !== (existing.unlockedAt === null)) {
		return row.unlockedAt !== null;
	}
	if (row.unlockedAt && existing.unlockedAt) {
		return row.unlockedAt < existing.unlockedAt;
	}
	return row.progress > existing.progress;
}

/**
 * Progress and unlocks for the whole catalogue. Definitions come from code, so
 * a stored row for a retired achievement is simply skipped, and an achievement
 * added since the operator's last QSO reads as locked at zero until the next
 * reconciliation.
 */
const achievements = protectedProcedure
	.input(profileInput)
	.handler(async ({ context, input }) => {
		const operator = await resolveOperator(context.db, input.callsign);

		const rows = await context.db
			.select({
				achievementId: userAchievement.achievementId,
				seasonId: userAchievement.seasonId,
				progress: userAchievement.progress,
				unlockedAt: userAchievement.unlockedAt,
			})
			.from(userAchievement)
			.where(eq(userAchievement.userId, operator.id));

		// Season-scoped achievements can be unlocked in any season; the profile
		// shows the best result the operator has ever reached.
		const best = new Map<
			string,
			{ progress: number; unlockedAt: Date | null }
		>();
		for (const row of rows) {
			const existing = best.get(row.achievementId);
			if (isBetterRow(row, existing)) {
				best.set(row.achievementId, {
					progress: row.progress,
					unlockedAt: row.unlockedAt,
				});
			}
		}

		return ACHIEVEMENTS.map((achievement) => {
			const stored = best.get(achievement.id);
			return {
				id: achievement.id,
				group: achievement.group,
				tier: achievement.tier,
				scope: achievement.scope,
				label: achievement.label,
				description: achievement.description,
				icon: achievement.icon,
				target: achievement.target,
				progress: Math.min(stored?.progress ?? 0, achievement.target),
				unlockedAt: stored?.unlockedAt ?? null,
			};
		});
	});

export const profileRouter = {
	achievements,
	distribution,
	get,
	recentQsos,
	squares,
};
