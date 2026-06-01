import { Button } from "@WAL-GO/ui/components/button";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@WAL-GO/ui/components/tooltip";
import { cn } from "@WAL-GO/ui/lib/utils";
import { Locate, LocateFixed, LocateOff } from "lucide-react";

import { useGeolocationSquare } from "./use-geolocation-square";

export function GeolocationSquareButton({
	className,
	disabled = false,
	onSquare,
}: {
	className?: string;
	disabled?: boolean;
	onSquare: (wal: string) => void;
}) {
	const { isActive, isLocating, permission, toggle } =
		useGeolocationSquare(onSquare);

	const isBlocked = permission === "denied" || permission === "unsupported";

	function getLabel() {
		if (isBlocked) {
			return "Vietos prieiga užblokuota";
		}
		if (isActive) {
			return "Nenaudoti mano vietos";
		}
		return "Nustatyti kvadratą pagal vietą";
	}

	function getIcon() {
		if (isLocating) {
			return <Spinner />;
		}
		if (isBlocked) {
			return <LocateOff />;
		}
		return isActive ? <LocateFixed /> : <Locate />;
	}

	const label = getLabel();

	return (
		<Tooltip>
			{/* Wrap in a span so the tooltip still shows when the button is disabled. */}
			<TooltipTrigger
				render={<span className={cn("inline-flex", className)} />}
			>
				<Button
					aria-label={label}
					aria-pressed={isActive}
					disabled={disabled || isBlocked || isLocating}
					// Keep focus (and its blur validation) on the field the user was editing.
					onClick={toggle}
					onMouseDown={(event) => event.preventDefault()}
					size="icon-sm"
					type="button"
					variant={isActive ? "default" : "outline"}
				>
					{getIcon()}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
