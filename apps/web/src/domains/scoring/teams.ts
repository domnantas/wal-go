export type Team = "yellow" | "green" | "red";

export const TEAM_ORDER = [
	"yellow",
	"green",
	"red",
] as const satisfies readonly Team[];

export const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

export const TEAM_BAR_CLASSES: Record<Team, string> = {
	yellow: "bg-golden",
	green: "bg-olive",
	red: "bg-rust",
};

export const TEAM_DOT_CLASSES: Record<Team, string> = {
	yellow: "bg-golden",
	green: "bg-olive",
	red: "bg-rust",
};
