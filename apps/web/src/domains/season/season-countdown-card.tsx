import { cn } from "@WAL-GO/ui/lib/utils";
import { differenceInSeconds, format, intervalToDuration } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { formatInVilnius } from "@/lib/date";

const COUNTDOWN_TICK_MS = 1000;

interface SeasonCountdownCardProps {
	className?: string;
	onComplete: () => void;
	season: {
		name: string;
		startsAt: Date;
	};
	variant?: "badge" | "default";
}

function formatCountdown(target: Date, now: Date) {
	if (differenceInSeconds(target, now) <= 0) {
		return "Prasideda netrukus";
	}

	const duration = intervalToDuration({ start: now, end: target });
	const months = (duration.years ?? 0) * 12 + (duration.months ?? 0);
	const time = format(
		new Date(
			0,
			0,
			0,
			duration.hours ?? 0,
			duration.minutes ?? 0,
			duration.seconds ?? 0
		),
		"HH:mm:ss"
	);
	const dateParts = [
		months ? `${months} mėn.` : null,
		duration.days ? `${duration.days} d.` : null,
	].filter(Boolean);

	return [...dateParts, time].join(" ");
}

export function SeasonCountdownCard({
	className,
	onComplete,
	season,
	variant = "default",
}: SeasonCountdownCardProps) {
	const [now, setNow] = useState(() => new Date());
	const hasCompletedRef = useRef(false);
	const isBadge = variant === "badge";

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), COUNTDOWN_TICK_MS);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (
			hasCompletedRef.current ||
			differenceInSeconds(season.startsAt, now) > 0
		) {
			return;
		}

		hasCompletedRef.current = true;
		onComplete();
	}, [now, onComplete, season.startsAt]);

	if (isBadge) {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 font-medium text-muted-foreground text-xs backdrop-blur-sm",
					className
				)}
			>
				<span className="size-1.5 rounded-full bg-golden" />
				<span>Kitas sezonas {season.name}</span>
				<span className="text-muted-foreground/60">·</span>
				<span
					className="font-mono text-foreground tabular-nums"
					suppressHydrationWarning
				>
					{formatCountdown(season.startsAt, now)}
				</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"border border-border bg-card text-card-foreground",
				"rounded-4xl px-5 py-5",
				className
			)}
		>
			<p className="mb-2 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Kitas sezonas
			</p>
			<p className={cn("font-bold font-serif text-foreground", "text-xl")}>
				{season.name}
			</p>
			<p className="mt-1 text-muted-foreground text-xs">
				Pradžia {formatInVilnius(season.startsAt, "yyyy-MM-dd HH:mm")}
			</p>
			<div
				className={cn(
					"mt-3 rounded-md border border-border bg-muted/40 px-3 py-2",
					null
				)}
			>
				<p
					className={cn(
						"text-center font-bold text-foreground tabular-nums",
						"text-xl"
					)}
					suppressHydrationWarning
				>
					{formatCountdown(season.startsAt, now)}
				</p>
			</div>
		</div>
	);
}
