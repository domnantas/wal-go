import { QSO_BANDS, QSO_MODES, qso } from "@WAL-GO/db/schema/qsos";
import { seasonMembership } from "@WAL-GO/db/schema/seasons";
import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { getCurrentSeason } from "./seasons";

const createQsoInput = z.object({
	contactCallsign: z.string().trim().min(1).max(32),
	band: z.string().trim().pipe(z.enum(QSO_BANDS)),
	mode: z.string().trim().transform(normalizeValue).pipe(z.enum(QSO_MODES)),
	qsoAt: z.iso.datetime(),
	operatorSquare: z.string().trim().min(3).max(3),
	contactSquare: z.string().trim().min(3).max(3).nullable().optional(),
});

const deleteQsoInput = z.object({
	id: z.number().int().positive(),
});

function normalizeValue(value: string) {
	return value.trim().toUpperCase();
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
	};
}

const list = protectedProcedure.handler(async ({ context }) => {
	const currentSeason = await getCurrentSeason(context.db);
	if (!currentSeason) {
		return [];
	}

	const rows = await context.db
		.select()
		.from(qso)
		.where(
			and(
				eq(qso.userId, context.session.user.id),
				eq(qso.seasonId, currentSeason.id)
			)
		)
		.orderBy(desc(qso.qsoAt), desc(qso.id));

	return rows.map(serializeQso);
});

const create = protectedProcedure
	.input(createQsoInput)
	.handler(async ({ context, input }) => {
		const currentSeason = await getCurrentSeason(context.db);
		if (!currentSeason) {
			throw new ORPCError("NOT_FOUND", {
				message: "Šiuo metu sezonas nevyksta",
			});
		}

		const membership = await context.db
			.select()
			.from(seasonMembership)
			.where(
				and(
					eq(seasonMembership.userId, context.session.user.id),
					eq(seasonMembership.seasonId, currentSeason.id)
				)
			)
			.limit(1);

		if (!membership[0]) {
			throw new ORPCError("FORBIDDEN", {
				message: "Pirma prisijunkite prie sezono",
			});
		}

		const operatorSquare = normalizeWalSquare(input.operatorSquare);
		const contactSquare = input.contactSquare
			? normalizeWalSquare(input.contactSquare)
			: null;

		if (!isValidWalSquare(operatorSquare)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisingas mano WAL kvadratas",
			});
		}

		if (contactSquare && !isValidWalSquare(contactSquare)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisingas korespondento WAL kvadratas",
			});
		}

		const qsoAt = new Date(input.qsoAt);
		if (Number.isNaN(qsoAt.getTime())) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Neteisinga QSO data arba laikas",
			});
		}

		const rows = await context.db
			.insert(qso)
			.values({
				userId: context.session.user.id,
				seasonId: currentSeason.id,
				contactCallsign: normalizeValue(input.contactCallsign),
				band: input.band,
				mode: input.mode,
				qsoAt,
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

		return serializeQso(created);
	});

const deleteQso = protectedProcedure
	.input(deleteQsoInput)
	.handler(async ({ context, input }) => {
		const deletedRows = await context.db
			.delete(qso)
			.where(and(eq(qso.id, input.id), eq(qso.userId, context.session.user.id)))
			.returning();

		const deleted = deletedRows[0];
		if (!deleted) {
			throw new ORPCError("NOT_FOUND", {
				message: "QSO nerastas",
			});
		}

		return serializeQso(deleted);
	});

export const qsosRouter = {
	list,
	create,
	delete: deleteQso,
};
