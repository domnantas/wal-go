import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@WAL-GO/ui/components/tooltip";
import { BadgeCheck } from "lucide-react";

export function ScoreBadge({
	confirmed,
	score,
}: {
	confirmed: boolean;
	score: number;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
			{score}
			{confirmed ? (
				<Tooltip>
					<TooltipTrigger
						className="inline-flex items-center text-olive"
						render={<span />}
					>
						<BadgeCheck aria-label="Patvirtinta" className="size-4" />
					</TooltipTrigger>
					<TooltipContent>Patvirtintas ryšys – dvigubi taškai</TooltipContent>
				</Tooltip>
			) : null}
		</span>
	);
}
