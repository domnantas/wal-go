import { QSO_BANDS, QSO_MODES } from "@WAL-GO/db/schema/qsos";

import type {
	AchievementContext,
	AchievementDefinition,
	AchievementScope,
} from "./types";

const TOTAL_WAL_SQUARES = 210;

interface LithuanianPluralForms {
	few: string;
	many: string;
	one: string;
}

/**
 * Lithuanian numeral agreement: 1/21/31… takes singular, 2–9 (and 22–29…)
 * plural, 10–19 and round tens genitive plural. Descriptions interpolate the
 * tier target, so the noun case must follow the number.
 */
function pluralizeLt(
	count: number,
	{ one, few, many }: LithuanianPluralForms
): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) {
		return many;
	}
	if (mod10 === 1) {
		return one;
	}
	return few;
}

interface TieredSpec {
	description: (target: number) => string;
	group: string;
	icon: string;
	progress: AchievementDefinition["progress"];
	scope: AchievementScope;
	tiers: { target: number; label: string }[];
}

function tiered(spec: TieredSpec): AchievementDefinition[] {
	return spec.tiers.map((tier, index) => ({
		id: `${spec.group}-${tier.target}`,
		group: spec.group,
		tier: index + 1,
		scope: spec.scope,
		target: tier.target,
		label: tier.label,
		description: spec.description(tier.target),
		icon: spec.icon,
		progress: spec.progress,
	}));
}

function one(
	definition: Omit<AchievementDefinition, "tier" | "group"> &
		Partial<Pick<AchievementDefinition, "tier" | "group">>
): AchievementDefinition {
	return { tier: 1, group: definition.id, ...definition };
}

/**
 * The catalogue. Definitions live in code and are the single source of truth;
 * the database stores only unlocks and progress, so adding an achievement never
 * touches a migration unless it needs a counter that does not exist yet.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
	...tiered({
		group: "squares",
		scope: "career",
		icon: "Grid2x2",
		description: (target) =>
			`Dirbk eteryje iš ${target} skirtingų WAL kvadratų`,
		progress: (context: AchievementContext) => context.career.distinctSquares,
		tiers: [
			{ target: 10, label: "Turistas" },
			{ target: 25, label: "Klajoklis" },
			{ target: 50, label: "Kartografas" },
			{ target: 100, label: "Žemėlapis mintinai" },
			{ target: TOTAL_WAL_SQUARES, label: "Visa Lietuva" },
		],
	}),
	...tiered({
		group: "qso",
		scope: "career",
		icon: "Radio",
		description: (target) => `Įrašyk į žurnalą ${target} QSO`,
		progress: (context: AchievementContext) => context.career.qsoCount,
		tiers: [
			{ target: 100, label: "Šimtukas" },
			{ target: 500, label: "Darbo arklys" },
			{ target: 1000, label: "Tūkstantininkas" },
			{ target: 5000, label: "Eterio legenda" },
		],
	}),
	...tiered({
		group: "callsigns",
		scope: "career",
		icon: "Users",
		description: (target) =>
			`Susisiek su ${target} ${pluralizeLt(target, {
				one: "skirtingu šaukiniu",
				few: "skirtingais šaukiniais",
				many: "skirtingų šaukinių",
			})}`,
		progress: (context: AchievementContext) => context.career.distinctCallsigns,
		tiers: [
			{ target: 25, label: "Kaimynai" },
			{ target: 50, label: "Adresų knygelė" },
			{ target: 100, label: "Visų draugas" },
			{ target: 250, label: "Eterio ambasadorius" },
		],
	}),
	...tiered({
		group: "confirmed",
		scope: "career",
		icon: "BadgeCheck",
		description: (target) =>
			`Surink ${target} ${pluralizeLt(target, {
				one: "abipusiai patvirtintą QSO",
				few: "abipusiai patvirtintus QSO",
				many: "abipusiai patvirtintų QSO",
			})}`,
		progress: (context: AchievementContext) => context.career.confirmedCount,
		tiers: [
			{ target: 10, label: "QSL!" },
			{ target: 50, label: "Pašto balandis" },
			{ target: 200, label: "Antspaudų kolekcija" },
		],
	}),
	...tiered({
		group: "bands",
		scope: "career",
		icon: "AudioLines",
		description: (target) =>
			`Išbandyk ${target} ${pluralizeLt(target, {
				one: "skirtingą juostą",
				few: "skirtingas juostas",
				many: "skirtingų juostų",
			})}`,
		progress: (context: AchievementContext) => context.career.bands.length,
		tiers: [
			{ target: 3, label: "Apšilimas" },
			{ target: 5, label: "Juostų medžiotojas" },
			{ target: 10, label: "Bangų klajūnas" },
			{ target: QSO_BANDS.length, label: "Nuo 160 m iki 1 mm" },
		],
	}),
	...tiered({
		group: "streak",
		scope: "season",
		icon: "Flame",
		description: (target) =>
			`Dirbk eteryje ${target} ${pluralizeLt(target, {
				one: "dieną",
				few: "dienas",
				many: "dienų",
			})} iš eilės`,
		progress: (context: AchievementContext) => context.season.longestStreak,
		tiers: [
			{ target: 3, label: "Kibirkštis" },
			{ target: 7, label: "Savaitė eteryje" },
			{ target: 14, label: "Geležinės ausinės" },
			{ target: 30, label: "Amžina ugnis" },
		],
	}),
	...tiered({
		group: "night",
		scope: "career",
		icon: "Moon",
		description: (target) =>
			`Užmegzk ${target} ${pluralizeLt(target, {
				one: "ryšį",
				few: "ryšius",
				many: "ryšių",
			})} tarp 00:00 ir 05:00`,
		progress: (context: AchievementContext) => context.career.nightQsoCount,
		tiers: [
			{ target: 10, label: "Naktinė pamaina" },
			{ target: 50, label: "Pelėda" },
		],
	}),
	...tiered({
		group: "season-squares",
		scope: "season",
		icon: "MapPin",
		description: (target) =>
			`Dirbk iš ${target} skirtingų kvadratų per vieną sezoną`,
		progress: (context: AchievementContext) => context.season.distinctSquares,
		tiers: [
			{ target: 5, label: "Žvalgyba" },
			{ target: 25, label: "Ekspedicija" },
			{ target: 50, label: "Didysis žygis" },
			{ target: 100, label: "Užkariautojas" },
			{ target: TOTAL_WAL_SQUARES, label: "Grand Slam" },
		],
	}),
	...tiered({
		group: "points",
		scope: "season",
		icon: "Trophy",
		description: (target) => `Surink ${target} taškų per vieną sezoną`,
		progress: (context: AchievementContext) => context.season.points,
		tiers: [
			{ target: 100, label: "Pirmas šimtas" },
			{ target: 500, label: "Taškų kalnas" },
			{ target: 1500, label: "Aukso gysla" },
		],
	}),
	one({
		id: "modes-all",
		scope: "season",
		target: QSO_MODES.length,
		label: "Poliglotas",
		description: `Dirbk visomis rūšimis (${QSO_MODES.join(", ")}) per vieną sezoną`,
		icon: "Languages",
		progress: (context) => context.season.modes.length,
	}),
	one({
		id: "worked-all-teams",
		scope: "career",
		target: 3,
		label: "Diplomatas",
		description: "Užmegzk ryšį su visų trijų komandų operatoriais",
		icon: "Handshake",
		progress: async (context) => (await context.extra.workedTeams()).size,
	}),
	one({
		id: "confirmed-day-100",
		scope: "season",
		target: 100,
		label: "Derlinga diena",
		description: "Surink 100 patvirtintų QSO per vieną dieną",
		icon: "CalendarCheck",
		progress: (context) => context.extra.bestConfirmedDay(),
	}),
	one({
		id: "qso-day-500",
		scope: "season",
		target: 500,
		label: "Maratonas",
		description: "Užregistruok 500 QSO per vieną dieną",
		icon: "Zap",
		progress: (context) => context.extra.bestQsoDay(),
	}),
	one({
		id: "season-active-days-20",
		scope: "season",
		target: 20,
		label: "Etatinis darbuotojas",
		description: "Dirbk eteryje 20 skirtingų sezono dienų",
		icon: "CalendarDays",
		progress: (context) => context.season.activeDays,
	}),
	one({
		id: "february-16",
		scope: "career",
		target: 1,
		label: "Vasario 16-oji",
		description: "Užmegzk ryšį Vasario 16-ąją — Valstybės atkūrimo dieną",
		icon: "Flag",
		progress: (context) => context.extra.february16QsoCount(),
	}),
	one({
		id: "tester",
		scope: "career",
		target: 1,
		label: "Bandomasis triušis",
		description: "Dalyvavauk bandomajame alfa arba beta sezone",
		icon: "Rocket",
		progress: (context) => context.extra.testSeasonCount(),
	}),
];

export const ACHIEVEMENTS_BY_ID = new Map(
	ACHIEVEMENTS.map((achievement) => [achievement.id, achievement])
);
