import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { pluralizeLt } from "@/lib/plural";
import { orpc } from "@/utils/orpc";
import { TEAM_CONFIG, TEAM_LABELS, TEAMS, type Team } from "../season/team";

const EMPTY_SCORES: Record<Team, number> = {
	yellow: 0,
	green: 0,
	red: 0,
};

function pointsLabel(score: number) {
	return `${score} ${pluralizeLt(score, {
		one: "tašką",
		few: "taškus",
		many: "taškų",
	})}`;
}

interface SelectedSquareStatsBoxProps {
	seasonId: number | null;
	selectedSquareCode: string | null;
	variant?: "panel" | "row";
}

export function SelectedSquareStatsBox({
	selectedSquareCode,
	seasonId,
	variant = "panel",
}: SelectedSquareStatsBoxProps) {
	const { data } = useQuery(
		orpc.scoring.squares.queryOptions({
			input: { seasonId: seasonId ?? undefined },
		})
	);

	if (selectedSquareCode === null) {
		return null;
	}

	const selectedSquare = data?.find(
		(square) => square.code === selectedSquareCode
	);
	const scores = selectedSquare?.scores ?? EMPTY_SCORES;
	const maxScore = Math.max(...TEAMS.map((team) => scores[team]));
	const progressMax = Math.max(maxScore, 1);

	if (variant === "row") {
		return (
			<section className="flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-3.5">
				<p className="shrink-0 font-bold font-serif text-[18px] text-foreground">
					{selectedSquareCode}
				</p>
				<div className="flex flex-1 items-stretch gap-3">
					{TEAMS.map((team) => {
						const score = scores[team];
						const progress = (score / progressMax) * 100;

						return (
							<div className="flex flex-1 flex-col gap-1.5" key={team}>
								<div className="flex items-center justify-between gap-2">
									<div className="flex min-w-0 items-center gap-1.5">
										<span
											aria-hidden="true"
											className={cn(
												"size-2 shrink-0 rounded-full",
												TEAM_CONFIG[team].dot
											)}
										/>
										<span className="truncate font-medium text-foreground text-xs">
											{TEAM_LABELS[team]}
										</span>
									</div>
									<span className="shrink-0 font-semibold text-foreground text-xs tabular-nums">
										{score}
									</span>
								</div>
								<div
									aria-label={`${TEAM_LABELS[team]} komanda turi ${pointsLabel(score)} kvadrate ${selectedSquareCode}`}
									aria-valuemax={progressMax}
									aria-valuemin={0}
									aria-valuenow={score}
									className="h-1.5 overflow-hidden rounded-lg bg-muted"
									role="progressbar"
								>
									<div
										className={cn(
											"h-full rounded-lg transition-[width] duration-500",
											TEAM_CONFIG[team].bar
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

	return (
		<section className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Kvadrato statistika
			</p>
			<p className="mb-3 font-bold font-serif text-[18px] text-foreground">
				{selectedSquareCode}
			</p>
			<div className="flex flex-col gap-3.5">
				{TEAMS.map((team) => {
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
											TEAM_CONFIG[team].dot
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
								aria-label={`${TEAM_LABELS[team]} komanda turi ${pointsLabel(score)} kvadrate ${selectedSquareCode}`}
								aria-valuemax={progressMax}
								aria-valuemin={0}
								aria-valuenow={score}
								className="h-1.75 overflow-hidden rounded-lg bg-muted"
								role="progressbar"
							>
								<div
									className={cn(
										"h-full rounded-lg transition-[width] duration-500",
										TEAM_CONFIG[team].bar
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
