import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@WAL-GO/ui/components/tooltip";
import { Check } from "lucide-react";

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
						className="inline-flex items-center rounded-full bg-green-500/15 p-0.5 text-green-600"
						render={<span />}
					>
						<Check className="size-3" />
					</TooltipTrigger>
					<TooltipContent>Patvirtintas ryšys – dvigubi taškai</TooltipContent>
				</Tooltip>
			) : null}
		</span>
	);
}
