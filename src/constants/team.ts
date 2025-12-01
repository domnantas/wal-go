export const TEAMS = ["yellow", "green", "red"] as const;

export type Team = (typeof TEAMS)[number];

export function isValidTeam(value: string): value is Team {
  return TEAMS.includes(value as Team);
}
