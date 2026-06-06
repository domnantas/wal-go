import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { orpc } from "@/utils/orpc";
import { fireTeamConfetti, type Team } from "./team";

export function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

const CONFETTI_DELAY_MS = 300;

export function useWinnerConfetti(seasonId: number | null, enabled: boolean) {
	const { data: standings } = useQuery({
		...orpc.scoring.teamStandings.queryOptions({
			input: { seasonId: seasonId ?? undefined },
		}),
		enabled: enabled && seasonId !== null,
	});

	const winner = standings?.[0];
	const winnerTeam = winner?.team as Team | undefined;
	const hasScore =
		!!winner && (winner.squaresControlled > 0 || winner.points > 0);
	const firedSeasonRef = useRef<number | null>(null);

	useEffect(() => {
		if (!(enabled && winnerTeam && hasScore) || seasonId === null) {
			return;
		}
		if (firedSeasonRef.current === seasonId || prefersReducedMotion()) {
			return;
		}
		firedSeasonRef.current = seasonId;
		const timer = setTimeout(
			() => fireTeamConfetti(winnerTeam),
			CONFETTI_DELAY_MS
		);
		return () => clearTimeout(timer);
	}, [enabled, winnerTeam, hasScore, seasonId]);
}
