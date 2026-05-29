import { user } from "@WAL-GO/db/schema/auth";
import { season } from "@WAL-GO/db/schema/seasons";
import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../index";

function deriveSeasonStatus(
	startsAt: Date,
	endsAt: Date,
	now: Date
): "active" | "ended" | "upcoming" {
	if (now < startsAt) {
		return "upcoming";
	}
	if (now > endsAt) {
		return "ended";
	}
	return "active";
}

const listUsers = adminProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			banned: user.banned,
			banReason: user.banReason,
			createdAt: user.createdAt,
		})
		.from(user)
		.orderBy(asc(user.createdAt));
	return rows;
});

const setUserRole = adminProcedure
	.input(z.object({ userId: z.string(), role: z.enum(["user", "admin"]) }))
	.handler(async ({ context, input }) => {
		await context.db
			.update(user)
			.set({ role: input.role })
			.where(eq(user.id, input.userId));
	});

const banUser = adminProcedure
	.input(z.object({ userId: z.string(), banReason: z.string().optional() }))
	.handler(async ({ context, input }) => {
		if (input.userId === context.session.user.id) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Negalima užblokuoti savęs",
			});
		}
		await context.db
			.update(user)
			.set({ banned: true, banReason: input.banReason ?? null })
			.where(eq(user.id, input.userId));
	});

const unbanUser = adminProcedure
	.input(z.object({ userId: z.string() }))
	.handler(async ({ context, input }) => {
		await context.db
			.update(user)
			.set({ banned: false, banReason: null })
			.where(eq(user.id, input.userId));
	});

const listSeasons = adminProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select()
		.from(season)
		.orderBy(asc(season.startsAt));
	const now = new Date();
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		status: deriveSeasonStatus(row.startsAt, row.endsAt, now),
	}));
});

const seasonInput = z.object({
	name: z.string().trim().min(1).max(120),
	startsAt: z.iso.datetime(),
	endsAt: z.iso.datetime(),
});

function validateSeasonDates(startsAt: Date, endsAt: Date) {
	if (endsAt <= startsAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pabaigos data turi būti vėlesnė nei pradžios data",
		});
	}
}

const createSeason = adminProcedure
	.input(seasonInput)
	.handler(async ({ context, input }) => {
		const startsAt = new Date(input.startsAt);
		const endsAt = new Date(input.endsAt);
		validateSeasonDates(startsAt, endsAt);
		const rows = await context.db
			.insert(season)
			.values({ name: input.name, startsAt, endsAt })
			.returning();
		const row = rows[0];
		if (!row) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
		return row;
	});

const updateSeason = adminProcedure
	.input(z.object({ id: z.number().int().positive() }).merge(seasonInput))
	.handler(async ({ context, input }) => {
		const startsAt = new Date(input.startsAt);
		const endsAt = new Date(input.endsAt);
		validateSeasonDates(startsAt, endsAt);
		const rows = await context.db
			.update(season)
			.set({ name: input.name, startsAt, endsAt })
			.where(eq(season.id, input.id))
			.returning();
		if (!rows[0]) {
			throw new ORPCError("NOT_FOUND", { message: "Sezonas nerastas" });
		}
	});

const deleteSeason = adminProcedure
	.input(z.object({ id: z.number().int().positive() }))
	.handler(async ({ context, input }) => {
		await context.db.delete(season).where(eq(season.id, input.id));
	});

export const adminRouter = {
	users: {
		list: listUsers,
		setRole: setUserRole,
		ban: banUser,
		unban: unbanUser,
	},
	seasons: {
		list: listSeasons,
		create: createSeason,
		update: updateSeason,
		delete: deleteSeason,
	},
};
