import { useQuery } from "@tanstack/react-query";
import {
	differenceInSeconds,
	format,
	formatDistanceToNowStrict,
} from "date-fns";
import { lt } from "date-fns/locale";
import { orpc } from "@/utils/orpc";

export function SeasonProgressBox() {
	const { data: season } = useQuery(orpc.seasons.current.queryOptions());

	if (!season) {
		return null;
	}

	const now = new Date();
	const totalLengthSeconds = differenceInSeconds(
		season.endsAt,
		season.startsAt
	);
	const elapsedSeconds = differenceInSeconds(now, season.startsAt);
	const percentageTimeLeft = Math.min(
		100,
		Math.max(0, (elapsedSeconds / totalLengthSeconds) * 100)
	);

	const timeLeft = formatDistanceToNowStrict(season.endsAt, { locale: lt });

	return (
		<div className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Sezonas
			</p>
			<p className="mb-0.5 font-bold font-serif text-[18px] text-foreground">
				{season.name}
			</p>
			<p className="mb-3 text-[11px] text-muted-foreground/70">
				{format(season.startsAt, "yyyy-MM-dd")} →{" "}
				{format(season.endsAt, "yyyy-MM-dd")}
			</p>
			<div className="mb-1.5 h-1.75 overflow-hidden rounded-lg bg-muted">
				<div
					className="h-full rounded-lg bg-accent transition-[width] duration-500"
					style={{ width: `${percentageTimeLeft}%` }}
				/>
			</div>
			<div className="flex justify-between text-[11px] text-muted-foreground/70">
				<span>{Math.round(percentageTimeLeft)}% baigta</span>
				<span>Liko {timeLeft}</span>
			</div>
		</div>
	);
}
