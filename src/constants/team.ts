export const TEAMS = ["yellow", "green", "red"] as const;

export type Team = (typeof TEAMS)[number];

export const TEAM_LABELS: Record<Team, string> = {
  yellow: "Geltona",
  green: "Žalia",
  red: "Raudona",
};
