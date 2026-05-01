import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

type Team = "yellow" | "green" | "red";

const TEAM_ORDER = [
	"yellow",
	"green",
	"red",
] as const satisfies readonly Team[];

const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

const TEAM_BAR_CLASSES: Record<Team, string> = {
	yellow: "bg-golden",
	green: "bg-olive",
	red: "bg-rust",
};

const TEAM_DOT_CLASSES: Record<Team, string> = {
	yellow: "bg-golden",
	green: "bg-olive",
	red: "bg-rust",
};

const EMPTY_SCORES: Record<Team, number> = {
	yellow: 0,
	green: 0,
	red: 0,
};

interface SelectedSquareStatsBoxProps {
	selectedSquareCode: string | null;
}

export function SelectedSquareStatsBox({
	selectedSquareCode,
}: SelectedSquareStatsBoxProps) {
	const { data } = useQuery(orpc.scoring.squares.queryOptions({ input: {} }));

	if (selectedSquareCode === null) {
		return null;
	}

	const selectedSquare = data?.find(
		(square) => square.code === selectedSquareCode
	);
	const scores = selectedSquare?.scores ?? EMPTY_SCORES;
	const maxScore = Math.max(...TEAM_ORDER.map((team) => scores[team]));
	const progressMax = Math.max(maxScore, 1);

	return (
		<section className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Kvadrato statistika
			</p>
			<p className="mb-3 font-bold font-serif text-[18px] text-foreground">
				{selectedSquareCode}
			</p>
			<div className="flex flex-col gap-3.5">
				{TEAM_ORDER.map((team) => {
					const score = scores[team];
					const progress = (score / progressMax) * 100;

					return (
						<div className="flex flex-col gap-1.5" key={team}>
							<div className="flex items-center justify-between gap-3">
								<div className="flex min-w-0 items-center gap-2">
									<span
										aria-hidden="true"
										className={cn(
											"size-2 shrink-0 rounded-full",
											TEAM_DOT_CLASSES[team]
										)}
									/>
									<span className="truncate font-medium text-foreground text-xs">
										{TEAM_LABELS[team]}
									</span>
								</div>
								<span className="shrink-0 font-medium text-muted-foreground text-xs tabular-nums">
									{score}
								</span>
							</div>
							<div
								aria-label={`${TEAM_LABELS[team]} komanda turi ${score} taškų kvadrate ${selectedSquareCode}`}
								aria-valuemax={progressMax}
								aria-valuemin={0}
								aria-valuenow={score}
								className="h-1.75 overflow-hidden rounded-lg bg-muted"
								role="progressbar"
							>
								<div
									className={cn(
										"h-full rounded-lg transition-[width] duration-500",
										TEAM_BAR_CLASSES[team]
									)}
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
