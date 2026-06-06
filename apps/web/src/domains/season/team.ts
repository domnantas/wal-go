import confetti from "canvas-confetti";

export const TEAMS = ["yellow", "green", "red"] as const;
export type Team = (typeof TEAMS)[number];

export const TOTAL_SQUARES = 210;

export const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

export const TEAM_CONFIG: Record<
	Team,
	{ label: string; dot: string; bar: string }
> = {
	yellow: { label: "Geltona", dot: "bg-golden", bar: "bg-golden" },
	green: { label: "Žalia", dot: "bg-olive", bar: "bg-olive" },
	red: { label: "Raudona", dot: "bg-rust", bar: "bg-rust" },
};

export const TEAM_RESULT_CLASSES: Record<Team, string> = {
	yellow: "border-golden/40 bg-golden/15 text-golden",
	green: "border-olive/40 bg-olive/15 text-olive",
	red: "border-rust/40 bg-rust/15 text-rust",
};

export const SQUARE_FORMS = {
	one: "kvadratas",
	few: "kvadratai",
	many: "kvadratų",
} as const;

export const POINT_FORMS = {
	one: "taškas",
	few: "taškai",
	many: "taškų",
} as const;

export const TEAM_CONFETTI_COLORS: Record<Team, string[]> = {
	yellow: ["#D4A017", "#F0C040", "#FFE08A", "#FFFACD"],
	green: ["#3A5A2E", "#5A8A48", "#8AB87C", "#C5E8B0"],
	red: ["#9B3A2A", "#C45A40", "#E88060", "#FFB4A0"],
};

export function fireTeamConfetti(team: Team) {
	const colors = TEAM_CONFETTI_COLORS[team];
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { x: 0.3, y: 0.65 },
		colors,
		angle: 60,
		scalar: 1.2,
	});
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { x: 0.7, y: 0.65 },
		colors,
		angle: 120,
		scalar: 1.2,
	});
}
