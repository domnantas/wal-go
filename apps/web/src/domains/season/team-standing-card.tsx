import { cn } from "@WAL-GO/ui/lib/utils";
import { pluralizeLt } from "@/lib/plural";
import { POINT_FORMS, TEAM_CONFIG, type Team, TOTAL_SQUARES } from "./team";

interface TeamStandingCardProps {
	points: number;
	showPoints?: boolean;
	squaresControlled: number;
	team: Team;
}

export function TeamStandingCard({
	team,
	squaresControlled,
	points,
	showPoints = false,
}: TeamStandingCardProps) {
	const config = TEAM_CONFIG[team];
	const pct = (squaresControlled / TOTAL_SQUARES) * 100;
	return (
		<div className="rounded-4xl border border-border bg-card p-5">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<span className={cn("size-3 rounded-full", config.dot)} />
					<span className="font-bold font-serif text-xl">{config.label}</span>
				</div>
				<span className="font-mono font-semibold text-sm">
					{squaresControlled}/{TOTAL_SQUARES}
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full", config.bar)}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div
				className={cn(
					"mt-3 flex items-center text-muted-foreground text-xs",
					showPoints ? "justify-between" : "justify-end"
				)}
			>
				{showPoints && (
					<span>
						{points} {pluralizeLt(points, POINT_FORMS)}
					</span>
				)}
				<span>{pct.toFixed(1)}% teritorijos</span>
			</div>
		</div>
	);
}
