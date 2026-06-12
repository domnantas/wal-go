import { Button } from "@WAL-GO/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
	differenceInHours,
	differenceInSeconds,
	format,
	formatDistanceToNowStrict,
	intervalToDuration,
} from "date-fns";
import { lt } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { formatInVilnius } from "@/lib/date";
import { pluralizeLt } from "@/lib/plural";

function formatTimeLeft(target: Date, now: Date): string {
	const secondsLeft = differenceInSeconds(target, now);
	if (secondsLeft <= 0) {
		return "baigiasi netrukus";
	}
	if (differenceInHours(target, now) < 24) {
		const duration = intervalToDuration({ start: now, end: target });
		return format(
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
	}
	return formatDistanceToNowStrict(target, { locale: lt });
}

const PROGRESS_TICK_MS = 1000;

interface SeasonProgressBoxProps {
	onComplete: () => void;
	season: {
		id: number;
		name: string;
		startsAt: Date;
		endsAt: Date;
		memberCount: number;
	};
	showJoinCta: boolean;
}

export function SeasonProgressBox({
	onComplete,
	season,
	showJoinCta,
}: SeasonProgressBoxProps) {
	const [now, setNow] = useState(() => new Date());
	const hasCompletedRef = useRef(false);

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), PROGRESS_TICK_MS);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (
			hasCompletedRef.current ||
			differenceInSeconds(season.endsAt, now) > 0
		) {
			return;
		}

		hasCompletedRef.current = true;
		onComplete();
	}, [now, onComplete, season.endsAt]);

	const totalLengthSeconds = differenceInSeconds(
		season.endsAt,
		season.startsAt
	);
	const elapsedSeconds = differenceInSeconds(now, season.startsAt);
	const percentageTimeLeft = Math.min(
		100,
		Math.max(0, (elapsedSeconds / totalLengthSeconds) * 100)
	);

	const timeLeft = formatTimeLeft(season.endsAt, now);

	return (
		<div className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
				Sezonas
			</p>
			<p className="mb-0.5 font-bold font-serif text-[18px] text-foreground">
				{season.name}
			</p>
			<p className="mb-1 text-[11px] text-muted-foreground/70">
				{formatInVilnius(season.startsAt)} → {formatInVilnius(season.endsAt)}
			</p>
			<p className="mb-3 text-[11px] text-muted-foreground/70">
				{season.memberCount}{" "}
				{pluralizeLt(season.memberCount, {
					one: "dalyvis",
					few: "dalyviai",
					many: "dalyvių",
				})}
			</p>
			<div className="mb-1.5 h-1.75 overflow-hidden rounded-lg bg-muted">
				<div
					className="h-full rounded-lg bg-accent transition-[width] duration-500"
					style={{ width: `${percentageTimeLeft.toFixed(2)}%` }}
					suppressHydrationWarning
				/>
			</div>
			<div className="flex justify-between text-[11px] text-muted-foreground/70">
				<span suppressHydrationWarning>
					{Math.round(percentageTimeLeft)}% baigta
				</span>
				<span suppressHydrationWarning>Liko {timeLeft}</span>
			</div>
			{showJoinCta ? (
				<Button
					className="mt-3 w-full"
					nativeButton={false}
					render={<Link to="/join-season" />}
					size="sm"
				>
					Prisijungti prie sezono
				</Button>
			) : null}
		</div>
	);
}
