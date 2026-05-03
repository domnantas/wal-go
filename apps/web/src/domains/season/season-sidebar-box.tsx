import { useCallback, useEffect, useState } from "react";
import { SeasonCountdownBox } from "./season-countdown-box";
import { SeasonProgressBox } from "./season-progress-box";
import { SeasonResultsBox } from "./season-results-box";

interface SidebarSeason {
	endsAt: Date;
	id: number;
	name: string;
	startsAt: Date;
}

interface SeasonSidebarBoxProps {
	activeSeason: SidebarSeason | null;
	isLoading: boolean;
	isMembershipLoading: boolean;
	membership: unknown;
	onSeasonTimingComplete: () => void;
	recentlyEndedSeason: SidebarSeason | null;
	upcomingSeason: SidebarSeason | null;
}

export function SeasonSidebarBox({
	activeSeason,
	isLoading,
	isMembershipLoading,
	membership,
	onSeasonTimingComplete,
	recentlyEndedSeason,
	upcomingSeason,
}: SeasonSidebarBoxProps) {
	const [activeSeasonEnded, setActiveSeasonEnded] = useState(false);
	const activeSeasonId = activeSeason?.id ?? null;

	useEffect(() => {
		if (activeSeasonId !== null) {
			setActiveSeasonEnded(false);
		}
	}, [activeSeasonId]);

	const handleProgressComplete = useCallback(() => {
		setActiveSeasonEnded(true);
		onSeasonTimingComplete();
	}, [onSeasonTimingComplete]);

	if (isLoading) {
		return null;
	}

	if (activeSeason && isMembershipLoading) {
		return null;
	}

	if (activeSeason && !activeSeasonEnded) {
		return (
			<SeasonProgressBox
				onComplete={handleProgressComplete}
				season={activeSeason}
				showJoinCta={!membership}
			/>
		);
	}

	const displayedResultsSeason =
		recentlyEndedSeason ??
		(activeSeasonEnded && activeSeason ? activeSeason : null);

	return (
		<>
			{upcomingSeason ? (
				<SeasonCountdownBox
					onComplete={onSeasonTimingComplete}
					season={upcomingSeason}
				/>
			) : null}
			{displayedResultsSeason ? (
				<SeasonResultsBox season={displayedResultsSeason} />
			) : null}
		</>
	);
}
