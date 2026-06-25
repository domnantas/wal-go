import {
	isBlockedCallsign,
	isValidCallsign,
	normalizeCallsign,
} from "@WAL-GO/callsign";
import { QSO_BANDS, QSO_MODES, qso } from "@WAL-GO/db/schema/qsos";
import { userSeasonScore } from "@WAL-GO/db/schema/scoring";
import { season, seasonMembership } from "@WAL-GO/db/schema/seasons";
import { cabrilloUpload } from "@WAL-GO/db/schema/uploads";
import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import type { SkipReason } from "@WAL-GO/log-parse";
import { ORPCError } from "@orpc/server";
import { formatISO, isAfter, isBefore, isValid, parseISO } from "date-fns";
import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { announceOwnershipChanges } from "../notifications/discord";
import { checkRateLimit } from "../rate-limit";
import { applyScoreDeltas, syncQsoScores } from "../scoring/apply-deltas";
import { getScoringRuleSet } from "../scoring/index";
import type { InsertParams, Tx } from "../scoring/types";
import { getCurrentSeason } from "./seasons";

const qsoInput = z.object({
	contactCallsign: z.string().trim().min(1).max(32),
	band: z.string().trim().pipe(z.enum(QSO_BANDS)),
	mode: z.string().trim().transform(normalizeValue).pipe(z.enum(QSO_MODES)),
	qsoAt: z.iso.datetime(),
	operatorSquare: z.string().trim().min(3).max(3),
	contactSquare: z.string().trim().min(2).max(3).nullable().optional(),
});

const PAGE_SIZE = 20;

const listInput = z
	.object({
		seasonId: z.number().int().positive().optional(),
		page: z.number().int().min(0).optional(),
		band: z.enum(QSO_BANDS).optional(),
	})
	.optional();

const deleteQsoInput = z.object({
	id: z.number().int().positive(),
});

const updateQsoInput = qsoInput.extend({
	id: z.number().int().positive(),
});

function normalizeValue(value: string) {
	return value.trim().toUpperCase();
}

function toNumber(value: number | string | null | undefined): number {
	return Number(value ?? 0);
}

function validateSquares(operatorSquare: string, contactSquare: string | null) {
	if (!isValidWalSquare(operatorSquare)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Neteisingas mano WAL kvadratas",
		});
	}
	if (
		contactSquare &&
		contactSquare !== "DX" &&
		!isValidWalSquare(contactSquare)
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Neteisingas korespondento WAL kvadratas",
		});
	}
}

function serializeQso(row: typeof qso.$inferSelect) {
	return {
		id: row.id,
		contactCallsign: row.contactCallsign,
		band: row.band,
		mode: row.mode,
		qsoAt: row.qsoAt,
		operatorSquare: row.operatorSquare,
		contactSquare: row.contactSquare,
		team: row.team,
		score: row.score,
		confirmed: row.confirmed,
	};
}

function getExactDuplicateKey(params: InsertParams): string {
	return [
		params.contactCallsign,
		params.band,
		params.mode,
		formatISO(params.qsoAt),
		params.operatorSquare,
		params.contactSquare ?? "",
	].join(":");
}

async function rejectExactQsoDuplicate(
	tx: Tx,
	params: InsertParams,
	excludeQsoId?: number
) {
	const excludeOwnQso = excludeQsoId ? ne(qso.id, excludeQsoId) : undefined;
	const existing = await tx
		.select({ id: qso.id })
		.from(qso)
		.where(
			and(
				excludeOwnQso,
				eq(qso.userId, params.userId),
				eq(qso.seasonId, params.seasonId),
				eq(qso.contactCallsign, params.contactCallsign),
				eq(qso.band, params.band as typeof qso.band._.data),
				eq(qso.mode, params.mode as typeof qso.mode._.data),
				eq(qso.qsoAt, params.qsoAt),
				eq(qso.operatorSquare, params.operatorSquare),
				sql`${qso.contactSquare} IS NOT DISTINCT FROM ${params.contactSquare}`
			)
		)
		.limit(1);

	if (existing[0]) {
		throw new ORPCError("CONFLICT", {
			message: "Toks QSO jau yra užregistruotas",
		});
	}
}

function normalizeQsoInput(input: z.infer<typeof qsoInput>) {
	const operatorSquare = normalizeWalSquare(input.operatorSquare);
	const contactSquare = input.contactSquare
		? normalizeWalSquare(input.contactSquare)
		: null;

	validateSquares(operatorSquare, contactSquare);

	const qsoAt = parseISO(input.qsoAt);
	if (!isValid(qsoAt)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Neteisinga QSO data arba laikas",
		});
	}

	return {
		contactCallsign: normalizeCallsign(input.contactCallsign),
		contactSquare,
		operatorSquare,
		qsoAt,
	};
}

async function filterExactQsoDuplicates(
	tx: Tx,
	params: InsertParams[]
): Promise<InsertParams[]> {
	const batchSeen = new Set<string>();
	const batchDeduped = params.filter((p) => {
		const key = getExactDuplicateKey(p);
		if (batchSeen.has(key)) {
			return false;
		}
		batchSeen.add(key);
		return true;
	});

	const first = batchDeduped[0];
	if (!first) {
		return [];
	}

	const existingRows = await tx
		.select({
			band: qso.band,
			contactCallsign: qso.contactCallsign,
			contactSquare: qso.contactSquare,
			mode: qso.mode,
			operatorSquare: qso.operatorSquare,
			qsoAt: qso.qsoAt,
		})
		.from(qso)
		.where(
			and(
				eq(qso.userId, first.userId),
				eq(qso.seasonId, first.seasonId),
				inArray(
					qso.contactCallsign,
					batchDeduped.map((p) => p.contactCallsign)
				)
			)
		);

	const existingKeys = new Set(
		existingRows.map((row) =>
			getExactDuplicateKey({
				band: row.band,
				contactCallsign: row.contactCallsign,
				contactSquare: row.contactSquare,
				mode: row.mode,
				operatorCallsign: "",
				operatorSquare: row.operatorSquare,
				qsoAt: row.qsoAt,
				seasonId: first.seasonId,
				team: first.team,
				userId: first.userId,
			})
		)
	);

	return batchDeduped.filter((p) => !existingKeys.has(getExactDuplicateKey(p)));
}

const list = protectedProcedure
	.input(listInput)
	.handler(async ({ context, input }) => {
		const page = input?.page ?? 0;
		const currentSeason =
			input?.seasonId === undefined ? await getCurrentSeason(context.db) : null;
		const resolvedSeasonId = input?.seasonId ?? currentSeason?.id;

		if (resolvedSeasonId === undefined) {
			return { items: [], total: 0, bands: [] };
		}

		const baseWhere = and(
			eq(qso.userId, context.session.user.id),
			eq(qso.seasonId, resolvedSeasonId)
		);
		const filteredWhere = and(
			baseWhere,
			input?.band === undefined ? undefined : eq(qso.band, input.band)
		);

		const [countResult, rows, bandRows] = await Promise.all([
			context.db
				.select({ count: sql<number>`count(*)` })
				.from(qso)
				.where(filteredWhere),
			context.db
				.select()
				.from(qso)
				.where(filteredWhere)
				.orderBy(desc(qso.qsoAt), desc(qso.id))
				.limit(PAGE_SIZE)
				.offset(page * PAGE_SIZE),
			context.db
				.selectDistinct({ band: qso.band })
				.from(qso)
				.where(baseWhere)
				.orderBy(qso.band),
		]);

		return {
			items: rows.map(serializeQso),
			total: toNumber(countResult[0]?.count),
			bands: bandRows.map((r) => r.band),
		};
	});

const stats = protectedProcedure
	.input(listInput)
	.handler(async ({ context, input }) => {
		const currentSeason =
			input?.seasonId === undefined ? await getCurrentSeason(context.db) : null;
		const resolvedSeasonId = input?.seasonId ?? currentSeason?.id;

		if (resolvedSeasonId === undefined) {
			return {
				totalQsos: 0,
				uniqueSquares: 0,
				points: 0,
				uniqueContactCallsigns: 0,
			};
		}

		const qsoStatsRows = await context.db
			.select({
				totalQsos: sql<number>`count(*)`,
				uniqueSquares: sql<number>`count(distinct ${qso.operatorSquare})`,
				uniqueContactCallsigns: sql<number>`count(distinct ${qso.contactCallsign})`,
			})
			.from(qso)
			.where(
				and(
					eq(qso.userId, context.session.user.id),
					eq(qso.seasonId, resolvedSeasonId)
				)
			);

		const scoreRows = await context.db
			.select({ points: userSeasonScore.points })
			.from(userSeasonScore)
			.where(
				and(
					eq(userSeasonScore.userId, context.session.user.id),
					eq(userSeasonScore.seasonId, resolvedSeasonId)
				)
			)
			.limit(1);

		const qsoStats = qsoStatsRows[0];

		return {
			totalQsos: toNumber(qsoStats?.totalQsos),
			uniqueSquares: toNumber(qsoStats?.uniqueSquares),
			points: scoreRows[0]?.points ?? 0,
			uniqueContactCallsigns: toNumber(qsoStats?.uniqueContactCallsigns),
		};
	});

const create = protectedProcedure
	.input(qsoInput)
	.handler(async ({ context, input }) => {
		await checkRateLimit(
			context.db,
			`qso:create:${context.session.user.id}`,
			120,
			60
		);
		const { contactCallsign, contactSquare, operatorSquare, qsoAt } =
			normalizeQsoInput(input);

		const userCallsign = normalizeCallsign(context.session.user.name);
		if (!isValidCallsign(contactCallsign)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisingas korespondento šaukinys",
			});
		}
		if (isBlockedCallsign(contactCallsign)) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Rusijos ir Baltarusijos šaukiniai neleistini. Слава Україні! 🇺🇦",
			});
		}
		if (contactCallsign === userCallsign) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Negalima registruoti QSO su savimi",
			});
		}

		const now = new Date();

		const result = await context.db.transaction(async (tx) => {
			const seasonRows = await tx
				.select()
				.from(season)
				.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
				.limit(1);

			const currentSeason = seasonRows[0];
			if (!currentSeason) {
				throw new ORPCError("NOT_FOUND", {
					message: "Šiuo metu sezonas nevyksta",
				});
			}

			if (
				isBefore(qsoAt, currentSeason.startsAt) ||
				isAfter(qsoAt, currentSeason.endsAt)
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "QSO data nepatenka į sezono laikotarpį",
				});
			}

			const membershipRows = await tx
				.select()
				.from(seasonMembership)
				.where(
					and(
						eq(seasonMembership.userId, context.session.user.id),
						eq(seasonMembership.seasonId, currentSeason.id)
					)
				)
				.for("update")
				.limit(1);

			if (!membershipRows[0]) {
				throw new ORPCError("FORBIDDEN", {
					message: "Prisijunkite prie sezono",
				});
			}

			const team = membershipRows[0].team;
			const userId = context.session.user.id;
			const ruleSet = getScoringRuleSet(currentSeason.scoringRuleSet);

			const insertParams: InsertParams = {
				band: input.band,
				contactCallsign,
				contactSquare,
				mode: input.mode,
				operatorCallsign: userCallsign,
				operatorSquare,
				qsoAt,
				seasonId: currentSeason.id,
				team,
				userId,
			};

			await rejectExactQsoDuplicate(tx, insertParams);
			await ruleSet.validateInsert(tx, insertParams);

			const rows = await tx
				.insert(qso)
				.values({
					userId,
					seasonId: currentSeason.id,
					contactCallsign,
					band: input.band,
					mode: input.mode,
					qsoAt,
					team,
					operatorSquare,
					contactSquare,
				})
				.returning();

			const created = rows[0];
			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Nepavyko išsaugoti QSO",
				});
			}

			const deltas = await ruleSet.scoreInsert(tx, insertParams);
			const changes = await applyScoreDeltas(tx, currentSeason.id, deltas);
			await syncQsoScores(tx, currentSeason.id);

			return { payload: serializeQso(created), changes };
		});

		announceOwnershipChanges(result.changes);
		return result.payload;
	});

const update = protectedProcedure
	.input(updateQsoInput)
	.handler(async ({ context, input }) => {
		await checkRateLimit(
			context.db,
			`qso:update:${context.session.user.id}`,
			120,
			60
		);
		const { contactCallsign, contactSquare, operatorSquare, qsoAt } =
			normalizeQsoInput(input);

		const userCallsign = normalizeCallsign(context.session.user.name);
		if (!isValidCallsign(contactCallsign)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisingas korespondento šaukinys",
			});
		}
		if (isBlockedCallsign(contactCallsign)) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Rusijos ir Baltarusijos šaukiniai neleistini. Слава Україні! 🇺🇦",
			});
		}
		if (contactCallsign === userCallsign) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Negalima registruoti QSO su savimi",
			});
		}

		const result = await context.db.transaction(async (tx) => {
			const existing = await tx
				.select()
				.from(qso)
				.where(
					and(eq(qso.id, input.id), eq(qso.userId, context.session.user.id))
				)
				.for("update")
				.limit(1);

			const qsoRow = existing[0];
			if (!qsoRow) {
				throw new ORPCError("NOT_FOUND", {
					message: "QSO nerastas",
				});
			}

			const seasonRows = await tx
				.select({
					endsAt: season.endsAt,
					startsAt: season.startsAt,
					scoringRuleSet: season.scoringRuleSet,
				})
				.from(season)
				.where(eq(season.id, qsoRow.seasonId))
				.limit(1);

			const qsoSeason = seasonRows[0];
			if (!qsoSeason) {
				throw new ORPCError("NOT_FOUND", {
					message: "Sezonas nerastas",
				});
			}

			const now = new Date();
			if (isAfter(now, qsoSeason.endsAt)) {
				throw new ORPCError("FORBIDDEN", {
					message: "Negalima redaguoti QSO pasibaigus sezonui",
				});
			}

			if (
				isBefore(qsoAt, qsoSeason.startsAt) ||
				isAfter(qsoAt, qsoSeason.endsAt)
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "QSO data nepatenka į sezono laikotarpį",
				});
			}

			const updateParams: InsertParams = {
				band: input.band,
				contactCallsign,
				contactSquare,
				mode: input.mode,
				operatorCallsign: userCallsign,
				operatorSquare,
				qsoAt,
				seasonId: qsoRow.seasonId,
				team: qsoRow.team,
				userId: qsoRow.userId,
			};
			const ruleSet = getScoringRuleSet(qsoSeason.scoringRuleSet);

			await rejectExactQsoDuplicate(tx, updateParams, input.id);
			await ruleSet.validateInsert(tx, updateParams, {
				excludeQsoId: input.id,
			});

			const deleteDeltas = await ruleSet.scoreDelete(tx, {
				band: qsoRow.band,
				contactCallsign: qsoRow.contactCallsign,
				contactSquare: qsoRow.contactSquare,
				mode: qsoRow.mode,
				operatorCallsign: userCallsign,
				operatorSquare: qsoRow.operatorSquare,
				qsoAt: qsoRow.qsoAt,
				qsoId: qsoRow.id,
				seasonId: qsoRow.seasonId,
				team: qsoRow.team,
				userId: qsoRow.userId,
			});

			const rows = await tx
				.update(qso)
				.set({
					contactCallsign,
					band: input.band,
					mode: input.mode,
					qsoAt,
					operatorSquare,
					contactSquare,
				})
				.where(eq(qso.id, input.id))
				.returning();

			const updated = rows[0];
			if (!updated) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Nepavyko atnaujinti QSO",
				});
			}

			const insertDeltas = await ruleSet.scoreInsert(tx, updateParams);
			const changes = await applyScoreDeltas(tx, qsoRow.seasonId, [
				...deleteDeltas,
				...insertDeltas,
			]);
			await syncQsoScores(tx, qsoRow.seasonId);

			return { payload: serializeQso(updated), changes };
		});

		announceOwnershipChanges(result.changes);
		return result.payload;
	});

const deleteQso = protectedProcedure
	.input(deleteQsoInput)
	.handler(async ({ context, input }) => {
		await checkRateLimit(
			context.db,
			`qso:delete:${context.session.user.id}`,
			120,
			60
		);
		const result = await context.db.transaction(async (tx) => {
			const existing = await tx
				.select()
				.from(qso)
				.where(
					and(eq(qso.id, input.id), eq(qso.userId, context.session.user.id))
				)
				.for("update")
				.limit(1);

			const qsoRow = existing[0];
			if (!qsoRow) {
				throw new ORPCError("NOT_FOUND", {
					message: "QSO nerastas",
				});
			}

			const seasonRows = await tx
				.select({
					endsAt: season.endsAt,
					scoringRuleSet: season.scoringRuleSet,
				})
				.from(season)
				.where(eq(season.id, qsoRow.seasonId))
				.limit(1);

			const now = new Date();
			if (seasonRows[0] && isAfter(now, seasonRows[0].endsAt)) {
				throw new ORPCError("FORBIDDEN", {
					message: "Negalima trinti QSO pasibaigus sezonui",
				});
			}

			const operatorCallsign = normalizeCallsign(context.session.user.name);
			const ruleSet = getScoringRuleSet(
				seasonRows[0]?.scoringRuleSet ?? "alpha"
			);
			const deltas = await ruleSet.scoreDelete(tx, {
				band: qsoRow.band,
				contactCallsign: qsoRow.contactCallsign,
				contactSquare: qsoRow.contactSquare,
				mode: qsoRow.mode,
				operatorCallsign,
				operatorSquare: qsoRow.operatorSquare,
				qsoAt: qsoRow.qsoAt,
				qsoId: qsoRow.id,
				seasonId: qsoRow.seasonId,
				team: qsoRow.team,
				userId: qsoRow.userId,
			});
			const changes = await applyScoreDeltas(tx, qsoRow.seasonId, deltas);

			await tx.delete(qso).where(eq(qso.id, input.id));
			await syncQsoScores(tx, qsoRow.seasonId);

			return { payload: serializeQso(qsoRow), changes };
		});

		announceOwnershipChanges(result.changes);
		return result.payload;
	});

export type QsoBand = (typeof QSO_BANDS)[number];

export type { SkipReason } from "@WAL-GO/log-parse";

export interface ImportError {
	content: string;
	line: number;
	reason: SkipReason;
}

export interface ImportSuccess {
	content: string;
	line: number;
	qso: ReturnType<typeof serializeQso>;
}

interface LineMeta {
	lineNumber: number;
	rawLine: string;
}

interface MappedQsos {
	errors: ImportError[];
	insertParams: InsertParams[];
	metaMap: Map<InsertParams, LineMeta>;
}

const QSO_BAND_SET = new Set<string>(QSO_BANDS);
const QSO_MODE_SET = new Set<string>(QSO_MODES);

interface CommitQso {
	band: string;
	contactCallsign: string;
	contactSquare: null | string;
	line: number;
	mode: string;
	operatorCallsign: string;
	operatorSquare: string;
	qsoAt: null | string;
	raw: string;
}

interface ValidatedRow {
	band: string;
	contactCallsign: string;
	contactSquare: null | string;
	mode: string;
	operatorSquare: string;
	qsoAt: Date;
}

interface RowContext {
	rejectsSameSquare: boolean;
	requiresContactSquare: boolean;
	seasonEnd: Date;
	seasonStart: Date;
	userCallsign: string;
}

/**
 * Authoritatively re-validate one edited row from the review dialog. Returns a
 * skip reason, or the normalized fields ready for insertion. Station-callsign
 * matching is advisory (handled in the dialog) — rows always insert under the
 * authenticated user.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: linear sequence of independent row checks reads clearer inline than split across helpers
function validateClientQso(
	row: CommitQso,
	ctx: RowContext
): SkipReason | ValidatedRow {
	if (!QSO_BAND_SET.has(row.band)) {
		return "invalidBand";
	}
	const mode = row.mode.trim().toUpperCase();
	if (!QSO_MODE_SET.has(mode)) {
		return "invalidMode";
	}

	const qsoAt = row.qsoAt ? parseISO(row.qsoAt) : null;
	if (!(qsoAt && isValid(qsoAt))) {
		return "invalidDate";
	}
	if (isBefore(qsoAt, ctx.seasonStart) || isAfter(qsoAt, ctx.seasonEnd)) {
		return "outsideSeason";
	}

	const operatorCallsign = normalizeCallsign(row.operatorCallsign);
	if (operatorCallsign && operatorCallsign !== ctx.userCallsign) {
		return "callsignMismatch";
	}

	const operatorSquare = normalizeWalSquare(row.operatorSquare);
	if (!isValidWalSquare(operatorSquare)) {
		return "invalidSquare";
	}

	const normalizedContact = row.contactSquare
		? normalizeWalSquare(row.contactSquare)
		: "";
	const contactSquare = normalizedContact === "" ? null : normalizedContact;
	if (ctx.requiresContactSquare && !contactSquare) {
		return "missingContactSquare";
	}
	if (
		contactSquare &&
		contactSquare !== "DX" &&
		!isValidWalSquare(contactSquare)
	) {
		return "invalidSquare";
	}

	const contactCallsign = normalizeCallsign(row.contactCallsign);
	if (!(contactCallsign && isValidCallsign(contactCallsign))) {
		return "invalidCallsign";
	}
	if (contactCallsign === ctx.userCallsign) {
		return "selfContact";
	}
	if (isBlockedCallsign(contactCallsign)) {
		return "blockedCallsign";
	}
	if (
		ctx.rejectsSameSquare &&
		contactSquare !== null &&
		contactSquare === operatorSquare
	) {
		return "sameSquare";
	}

	return {
		band: row.band,
		contactCallsign,
		contactSquare,
		mode,
		operatorSquare,
		qsoAt,
	};
}

/** Validate every edited row the review dialog submits before insert. */
function mapClientQsos(
	rows: CommitQso[],
	seasonStart: Date,
	seasonEnd: Date,
	seasonId: number,
	team: "green" | "red" | "yellow",
	userId: string,
	userCallsign: string,
	requiresContactSquare: boolean,
	rejectsSameSquare: boolean
): MappedQsos {
	const insertParams: InsertParams[] = [];
	const metaMap = new Map<InsertParams, LineMeta>();
	const errors: ImportError[] = [];
	const ctx: RowContext = {
		rejectsSameSquare,
		requiresContactSquare,
		seasonEnd,
		seasonStart,
		userCallsign,
	};

	for (const row of rows) {
		const result = validateClientQso(row, ctx);
		if (typeof result === "string") {
			errors.push({ line: row.line, content: row.raw, reason: result });
			continue;
		}
		const p: InsertParams = {
			...result,
			operatorCallsign: userCallsign,
			seasonId,
			team,
			userId,
		};
		insertParams.push(p);
		metaMap.set(p, { lineNumber: row.line, rawLine: row.raw });
	}

	return { insertParams, metaMap, errors };
}

function collectFilteredErrors(
	before: InsertParams[],
	after: InsertParams[],
	metaMap: Map<InsertParams, LineMeta>,
	reason: SkipReason
): ImportError[] {
	const afterSet = new Set(after);
	return before.flatMap((p) => {
		if (afterSet.has(p)) {
			return [];
		}
		const meta = metaMap.get(p);
		return meta
			? [{ line: meta.lineNumber, content: meta.rawLine, reason }]
			: [];
	});
}

const commitQsoInput = z.object({
	band: z.string().max(16),
	contactCallsign: z.string().max(32),
	contactSquare: z.string().max(8).nullable(),
	line: z.number().int(),
	mode: z.string().max(16),
	operatorCallsign: z.string().max(32),
	operatorSquare: z.string().max(8),
	qsoAt: z.string().max(40).nullable(),
	raw: z.string().max(2000),
});

async function applyBulkScoreDeltas(
	tx: Tx,
	seasonId: number,
	ruleSet: ReturnType<typeof getScoringRuleSet>,
	toInsert: InsertParams[]
): ReturnType<typeof applyScoreDeltas> {
	const changes = await applyBulkAggregateDeltas(
		tx,
		seasonId,
		ruleSet,
		toInsert
	);
	await syncQsoScores(tx, seasonId);
	return changes;
}

async function applyBulkAggregateDeltas(
	tx: Tx,
	seasonId: number,
	ruleSet: ReturnType<typeof getScoringRuleSet>,
	toInsert: InsertParams[]
): ReturnType<typeof applyScoreDeltas> {
	if (!ruleSet.usePerQsoScoring) {
		return applyScoreDeltas(tx, seasonId, ruleSet.scoreBulkInsert(toInsert));
	}
	const allDeltas: Parameters<typeof applyScoreDeltas>[2] = [];
	for (const p of toInsert) {
		const deltas = await ruleSet.scoreInsert(tx, p);
		for (const d of deltas) {
			allDeltas.push(d);
		}
	}
	return applyScoreDeltas(tx, seasonId, allDeltas);
}

const commitUploadInput = z.object({
	content: z.string().max(2_000_000),
	format: z.enum(["adif", "cabrillo"]),
	qsos: z.array(commitQsoInput).max(10_000),
});

const commitUpload = protectedProcedure
	.input(commitUploadInput)
	.handler(async ({ context, input }) => {
		await checkRateLimit(
			context.db,
			`qso:commitUpload:${context.session.user.id}`,
			10,
			3600
		);

		const userCallsign = normalizeCallsign(context.session.user.name);
		const callsign = context.session.user.name.toUpperCase();

		const result = await context.db.transaction(async (tx) => {
			const now = new Date();
			const seasonRows = await tx
				.select()
				.from(season)
				.where(and(lte(season.startsAt, now), gte(season.endsAt, now)))
				.limit(1);

			const currentSeason = seasonRows[0];
			if (!currentSeason) {
				throw new ORPCError("NOT_FOUND", {
					message: "Šiuo metu sezonas nevyksta",
				});
			}

			const membershipRows = await tx
				.select()
				.from(seasonMembership)
				.where(
					and(
						eq(seasonMembership.userId, context.session.user.id),
						eq(seasonMembership.seasonId, currentSeason.id)
					)
				)
				.for("update")
				.limit(1);

			if (!membershipRows[0]) {
				throw new ORPCError("FORBIDDEN", {
					message: "Prisijunkite prie sezono",
				});
			}

			const team = membershipRows[0].team;
			const userId = context.session.user.id;
			const ruleSet = getScoringRuleSet(currentSeason.scoringRuleSet);

			const {
				insertParams,
				metaMap,
				errors: mappingErrors,
			} = mapClientQsos(
				input.qsos,
				currentSeason.startsAt,
				currentSeason.endsAt,
				currentSeason.id,
				team,
				userId,
				userCallsign,
				ruleSet.requiresContactSquare,
				ruleSet.rejectsSameSquare
			);

			const exactDeduped = await filterExactQsoDuplicates(tx, insertParams);
			const exactDupErrors = collectFilteredErrors(
				insertParams,
				exactDeduped,
				metaMap,
				"exactDuplicate"
			);

			const toInsert = await ruleSet.filterBulkInserts(tx, exactDeduped);
			const gameDupErrors = collectFilteredErrors(
				exactDeduped,
				toInsert,
				metaMap,
				"gameDuplicate"
			);

			const imported: ImportSuccess[] = [];

			if (toInsert.length > 0) {
				const insertedRows = await tx
					.insert(qso)
					.values(
						toInsert.map((q) => ({
							userId,
							seasonId: currentSeason.id,
							contactCallsign: q.contactCallsign,
							band: q.band as typeof qso.band._.data,
							mode: q.mode as typeof qso.mode._.data,
							qsoAt: q.qsoAt,
							team,
							operatorSquare: q.operatorSquare,
							contactSquare: q.contactSquare,
						}))
					)
					.returning();

				for (const [index, insertedRow] of insertedRows.entries()) {
					const source = toInsert[index];
					const meta = source ? metaMap.get(source) : undefined;
					if (meta) {
						imported.push({
							content: meta.rawLine,
							line: meta.lineNumber,
							qso: serializeQso(insertedRow),
						});
					}
				}
			}

			const changes =
				toInsert.length > 0
					? await applyBulkScoreDeltas(tx, currentSeason.id, ruleSet, toInsert)
					: [];

			const errors = [...mappingErrors, ...exactDupErrors, ...gameDupErrors];

			await tx.insert(cabrilloUpload).values({
				userId,
				seasonId: currentSeason.id,
				callsign,
				format: input.format,
				accepted: toInsert.length,
				skipped: errors.length,
				cabrilloContent: input.content,
				importedLines: imported.map((s) => ({
					line: s.line,
					content: s.content,
				})),
				skippedLines: errors.map((e) => ({
					line: e.line,
					content: e.content,
					reason: e.reason,
				})),
			});

			return {
				payload: {
					accepted: toInsert.length,
					skipped: errors.length,
					errors,
					imported,
				},
				changes,
			};
		});

		announceOwnershipChanges(result.changes);
		return result.payload;
	});

export const qsosRouter = {
	list,
	stats,
	create,
	update,
	delete: deleteQso,
	commitUpload,
};
