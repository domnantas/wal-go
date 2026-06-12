import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { lt } from "date-fns/locale";
import { orpc } from "@/utils/orpc";
import { TEAM_DOT_CLASSES, TEAM_LABELS, type Team } from "./teams";

const SIDEBAR_LIMIT = 20;
const COMPACT_LIMIT = 6;

interface FeedEntry {
	after: Team | null;
	at: string | Date;
	before: Team | null;
	id: number;
	squareCode: string;
}

function describeChange(entry: FeedEntry): string {
	const { squareCode, before, after } = entry;
	if (after === null) {
		const lost = before ? ` (buvo ${TEAM_LABELS[before]})` : "";
		return `Kvadratas ${squareCode} tapo nevaldomas${lost}`;
	}
	if (before === null) {
		return `Kvadratą ${squareCode} užėmė ${TEAM_LABELS[after]}`;
	}
	return `Kvadratą ${squareCode} perėmė ${TEAM_LABELS[after]} (buvo ${TEAM_LABELS[before]})`;
}

interface ActivityFeedBoxProps {
	seasonId: number | null;
	variant?: "sidebar" | "compact";
}

export function ActivityFeedBox({
	seasonId,
	variant = "sidebar",
}: ActivityFeedBoxProps) {
	const limit = variant === "compact" ? COMPACT_LIMIT : SIDEBAR_LIMIT;
	const { data } = useQuery(
		orpc.scoring.activityFeed.queryOptions({
			input: { seasonId: seasonId ?? undefined, limit },
			refetchInterval: 20_000,
		})
	);

	const entries = (data ?? []) as FeedEntry[];

	return (
		<section
			className={cn(
				variant === "sidebar" && "border-border border-b px-5 py-4.5"
			)}
		>
			<p className="mb-3 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
				Aktyvumas
			</p>
			{entries.length === 0 ? (
				<p className="text-muted-foreground text-xs">Kol kas tylu</p>
			) : (
				<ul
					className={cn(
						variant === "sidebar"
							? "flex max-h-80 flex-col gap-3 overflow-y-auto"
							: "grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
					)}
				>
					{entries.map((entry) => (
						<li className="flex items-start gap-2" key={entry.id}>
							<span
								aria-hidden="true"
								className={cn(
									"mt-1 size-2 shrink-0 rounded-full",
									entry.after ? TEAM_DOT_CLASSES[entry.after] : "bg-muted"
								)}
							/>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-foreground text-xs leading-snug">
									{describeChange(entry)}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{formatDistanceToNowStrict(new Date(entry.at), {
										addSuffix: true,
										locale: lt,
									})}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
