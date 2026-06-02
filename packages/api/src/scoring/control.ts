export const TEAMS = ["yellow", "green", "red"] as const;
export type Team = (typeof TEAMS)[number];

/**
 * Determines which team controls a square from its per-team point counts.
 * A team controls the square only when it holds strictly more points than
 * every other team; a tie for the lead or an all-zero square is uncontrolled
 * (returns `null`). This is the single source of truth for the control rule,
 * shared by the team standings query and the takeover detector.
 */
export function computeLeader(scores: Record<Team, number>): Team | null {
	const maxPoints = Math.max(...TEAMS.map((team) => scores[team]));
	if (maxPoints <= 0) {
		return null;
	}
	const leaders = TEAMS.filter((team) => scores[team] === maxPoints);
	const [leader, ...rest] = leaders;
	return leader !== undefined && rest.length === 0 ? leader : null;
}

/** Lithuanian display label and emoji per team, for announcements. */
export const TEAM_DISPLAY: Record<Team, { label: string; emoji: string }> = {
	yellow: { label: "Geltona", emoji: "🟡" },
	green: { label: "Žalia", emoji: "🟢" },
	red: { label: "Raudona", emoji: "🔴" },
};
