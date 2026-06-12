import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createWalGridFeatureCollection } from "@/lib/wal-grid";
import { orpc } from "@/utils/orpc";
import {
	TEAM_BAR_CLASSES,
	TEAM_DOT_CLASSES,
	TEAM_LABELS,
	TEAM_ORDER,
} from "./teams";

const TOTAL_WAL_SQUARES = createWalGridFeatureCollection().features.length;

interface TeamControlledSquaresBoxProps {
	seasonId: number | null;
}

export function TeamControlledSquaresBox({
	seasonId,
}: TeamControlledSquaresBoxProps) {
	const { data } = useQuery(
		orpc.scoring.teamStandings.queryOptions({
			input: { seasonId: seasonId ?? undefined },
		})
	);

	const standings = data ?? [];

	return (
		<section className="border-border border-b px-5 py-4.5">
			<p className="mb-3 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
				Kontroliuojami kvadratai
			</p>
			<div className="flex flex-col gap-3.5">
				{TEAM_ORDER.map((team) => {
					const standing = standings.find((entry) => entry.team === team);
					const controlledSquares = standing?.squaresControlled ?? 0;
					const progress = (controlledSquares / TOTAL_WAL_SQUARES) * 100;

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
									{controlledSquares}/{TOTAL_WAL_SQUARES}
								</span>
							</div>
							<div
								aria-label={`${TEAM_LABELS[team]} komanda kontroliuoja ${controlledSquares} kvadratus`}
								aria-valuemax={TOTAL_WAL_SQUARES}
								aria-valuemin={0}
								aria-valuenow={controlledSquares}
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
