import { cn } from "@WAL-GO/ui/lib/utils";
import { pluralizeLt } from "@/lib/plural";
import {
	POINT_FORMS,
	SQUARE_FORMS,
	TEAM_LABELS,
	TEAM_RESULT_CLASSES,
	type Team,
} from "./team";

interface SeasonWinnerHeroProps {
	className?: string;
	points: number;
	squaresControlled: number;
	team: Team;
}

export function SeasonWinnerHero({
	team,
	points,
	squaresControlled,
	className,
}: SeasonWinnerHeroProps) {
	return (
		<section
			className={cn(
				"rounded-4xl border px-8 py-10 text-center",
				TEAM_RESULT_CLASSES[team],
				className
			)}
		>
			<p className="font-bold text-[11px] uppercase tracking-[0.12em]">
				Nugalėtojai
			</p>
			<p className="mt-2 font-bold font-serif text-5xl">{TEAM_LABELS[team]}</p>
			<p className="mt-3 font-medium text-foreground/70">
				{squaresControlled} {pluralizeLt(squaresControlled, SQUARE_FORMS)} ·{" "}
				{points} {pluralizeLt(points, POINT_FORMS)}
			</p>
		</section>
	);
}
