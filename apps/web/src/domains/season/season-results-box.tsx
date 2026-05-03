import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { orpc } from "@/utils/orpc";

type Team = "yellow" | "green" | "red";

const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

const TEAM_RESULT_CLASSES: Record<Team, string> = {
	yellow: "border-golden/40 bg-golden/15 text-golden",
	green: "border-olive/40 bg-olive/15 text-olive",
	red: "border-rust/40 bg-rust/15 text-rust",
};

interface SeasonResultsBoxProps {
	season: {
		id: number;
		name: string;
		endsAt: Date;
	};
}

export function SeasonResultsBox({ season }: SeasonResultsBoxProps) {
	const { data } = useQuery(
		orpc.scoring.teamStandings.queryOptions({
			input: { seasonId: season.id },
		})
	);

	const standings = data ?? [];
	const winner = standings[0];

	return (
		<section className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Sezono rezultatai
			</p>
			<p className="mb-0.5 font-bold font-serif text-[18px] text-foreground">
				{season.name}
			</p>
			<p className="mb-3 text-[11px] text-muted-foreground/70">
				Baigėsi {format(season.endsAt, "yyyy-MM-dd HH:mm")}
			</p>
			{winner ? (
				<div
					className={cn(
						"rounded-md border px-3 py-3",
						TEAM_RESULT_CLASSES[winner.team as Team]
					)}
				>
					<p className="mb-1 font-bold text-[10px] uppercase tracking-[0.08em]">
						Nugalėtojai
					</p>
					<p className="font-bold font-serif text-2xl">
						{TEAM_LABELS[winner.team as Team]}
					</p>
					<p className="mt-1 text-[11px] text-foreground/70">
						{winner.squaresControlled} kvadratai · {winner.points} taškai
					</p>
				</div>
			) : null}
		</section>
	);
}
