import { differenceInSeconds, format, intervalToDuration } from "date-fns";
import { useEffect, useRef, useState } from "react";

const COUNTDOWN_TICK_MS = 1000;

interface SeasonCountdownBoxProps {
	onComplete: () => void;
	season: {
		name: string;
		startsAt: Date;
	};
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

export function SeasonCountdownBox({
	onComplete,
	season,
}: SeasonCountdownBoxProps) {
	const [now, setNow] = useState(() => new Date());
	const hasCompletedRef = useRef(false);

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

	return (
		<div className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Kitas sezonas
			</p>
			<p className="mb-0.5 font-bold font-serif text-[18px] text-foreground">
				{season.name}
			</p>
			<p className="mb-3 text-[11px] text-muted-foreground/70">
				Pradžia {format(season.startsAt, "yyyy-MM-dd HH:mm")}
			</p>
			<div className="rounded-md border border-border bg-muted/40 px-3 py-2">
				<p
					className="text-center font-bold text-[18px] text-foreground tabular-nums"
					suppressHydrationWarning
				>
					{formatCountdown(season.startsAt, now)}
				</p>
			</div>
		</div>
	);
}
