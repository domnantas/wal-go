import { VALID_WAL_RANGES } from "@WAL-GO/grid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { customAlphabet } from "nanoid";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

// biome-ignore lint/performance/noNamespaceImport: seed script needs all tables
import * as schema from "./schema/index.ts";
import { QSO_BANDS, QSO_MODES } from "./schema/qsos.ts";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz";
const nanoid = customAlphabet(ALPHABET, 12);

const VALID_WAL_SQUARES: string[] = [];
for (const [letter, ranges] of Object.entries(VALID_WAL_RANGES)) {
	for (const [start, end] of ranges) {
		for (let n = start; n <= end; n++) {
			VALID_WAL_SQUARES.push(`${letter}${n.toString().padStart(2, "0")}`);
		}
	}
}

function randomItem<T>(arr: readonly T[]): T {
	// biome-ignore lint/style/noNonNullAssertion: arr is always non-empty at call sites
	return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(start: Date, end: Date): Date {
	return new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime())
	);
}

const TEAMS = ["yellow", "green", "red"] as const;
type Team = (typeof TEAMS)[number];

const OPERATORS = [
	{ callsign: "LY1A", email: "ly1a@wal.example" },
	{ callsign: "LY2B", email: "ly2b@wal.example" },
	{ callsign: "LY3C", email: "ly3c@wal.example" },
	{ callsign: "LY4D", email: "ly4d@wal.example" },
	{ callsign: "LY5E", email: "ly5e@wal.example" },
	{ callsign: "LY6F", email: "ly6f@wal.example" },
	{ callsign: "LY7G", email: "ly7g@wal.example" },
	{ callsign: "LY8H", email: "ly8h@wal.example" },
	{ callsign: "LY9I", email: "ly9i@wal.example" },
];

const CONTACT_CALLSIGNS = [
	"LY1AA",
	"LY2AB",
	"LY3AC",
	"LY4AD",
	"LY5AE",
	"LY2BA",
	"LY3BB",
	"LY4BC",
	"LY5BD",
	"LY6BE",
	"LY3CA",
	"LY4CB",
	"LY5CC",
	"LY6CD",
	"LY7CE",
	"LY4DA",
	"LY5DB",
	"LY6DC",
	"LY7DD",
	"LY8DE",
	"LY1KA",
	"LY2KB",
	"LY3KC",
	"LY4KD",
	"LY5KE",
	"LY1LA",
	"LY2LB",
	"LY3LC",
	"LY4LD",
	"LY5LE",
	"LY6MA",
	"LY7MB",
	"LY8MC",
	"LY9MD",
	"LY0ME",
];

async function seed() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL not set");
	}

	const client = postgres(process.env.DATABASE_URL);
	const db = drizzle({ client });

	await db.execute(sql`
		TRUNCATE qso, season_membership, season, square_score, user_season_score, session, account, verification, "user" RESTART IDENTITY CASCADE
	`);
	console.log("Database cleared.");

	const insertedSeason = await db
		.insert(schema.season)
		.values({
			name: "Dev 1",
			startsAt: new Date("2026-01-01T00:00:00Z"),
			endsAt: new Date("2026-12-31T23:59:59Z"),
		})
		.returning()
		.then((rows) => {
			if (!rows[0]) {
				throw new Error("Season insert returned no rows");
			}
			return rows[0];
		});

	console.log(`Season created: ${insertedSeason.id} — ${insertedSeason.name}`);

	const users: Array<{ id: string; team: Team }> = [];

	for (const [i, op] of OPERATORS.entries()) {
		const team: Team = TEAMS[i % TEAMS.length] as Team;
		const userId = nanoid();

		await db.insert(schema.user).values({
			id: userId,
			name: op.callsign,
			email: op.email,
			emailVerified: true,
		});

		await db.insert(schema.seasonMembership).values({
			seasonId: insertedSeason.id,
			userId,
			team,
		});

		users.push({ id: userId, team });
		console.log(`User ${op.callsign} created — team: ${team}`);
	}

	const seasonStart = new Date("2026-01-01T00:00:00Z");
	const seasonEnd = new Date("2026-05-22T00:00:00Z");

	const squareTotals = new Map<string, { team: Team; points: number }>();
	const userTotals = new Map<string, number>();

	let inserted = 0;
	let attempts = 0;

	while (inserted < 200 && attempts < 400) {
		attempts++;
		const user = randomItem(users);
		const operatorSquare = randomItem(VALID_WAL_SQUARES);
		const contactSquare =
			Math.random() > 0.3 ? randomItem(VALID_WAL_SQUARES) : null;

		const result = await db
			.insert(schema.qso)
			.values({
				userId: user.id,
				seasonId: insertedSeason.id,
				contactCallsign: randomItem(CONTACT_CALLSIGNS),
				band: randomItem(QSO_BANDS),
				mode: randomItem(QSO_MODES),
				qsoAt: randomDate(seasonStart, seasonEnd),
				team: user.team,
				operatorSquare,
				contactSquare,
			})
			.onConflictDoNothing()
			.returning();

		if (result.length > 0) {
			inserted++;
			const squareKey = `${operatorSquare}:${user.team}`;
			const existing = squareTotals.get(squareKey);
			squareTotals.set(squareKey, {
				team: user.team,
				points: (existing?.points ?? 0) + 1,
			});
			userTotals.set(user.id, (userTotals.get(user.id) ?? 0) + 1);
		}
	}

	console.log(`QSOs inserted: ${inserted} (${attempts} attempts)`);

	await db.insert(schema.squareScore).values(
		[...squareTotals.entries()].map(([key, { team, points }]) => ({
			seasonId: insertedSeason.id,
			squareCode: key.split(":")[0] as string,
			team,
			points,
		}))
	);

	await db.insert(schema.userSeasonScore).values(
		[...userTotals.entries()].map(([userId, points]) => ({
			seasonId: insertedSeason.id,
			userId,
			points,
		}))
	);

	console.log(
		`Scores inserted: ${squareTotals.size} squares, ${userTotals.size} users`
	);

	await client.end();
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
