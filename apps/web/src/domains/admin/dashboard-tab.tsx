import { Spinner } from "@WAL-GO/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Radio, Users } from "lucide-react";

import { orpc } from "@/utils/orpc";

type Team = "yellow" | "green" | "red";

const TEAMS: readonly Team[] = ["yellow", "green", "red"];

const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

const TEAM_DOT_CLASSES: Record<Team, string> = {
	yellow: "bg-golden",
	green: "bg-olive",
	red: "bg-rust",
};

const STATUS_LABELS = {
	active: "Aktyvus",
	upcoming: "Būsimas",
	ended: "Pasibaigęs",
} as const;

const STATUS_CLASSES = {
	active:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	ended: "bg-muted text-muted-foreground",
} as const;

function formatDate(date: Date) {
	return format(date, "yyyy-MM-dd");
}

export function DashboardTab() {
	const dashboard = useQuery(orpc.admin.dashboard.queryOptions());

	if (dashboard.isPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const data = dashboard.data;
	if (!data) {
		return null;
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<StatCard
					icon={<Users className="size-5 text-muted-foreground" />}
					label="Naudotojai"
					value={data.totalUsers}
				/>
				<StatCard
					icon={<Radio className="size-5 text-muted-foreground" />}
					label="Viso QSO"
					value={data.totalQsos}
				/>
				<StatCard icon={null} label="Sezonai" value={data.seasons.length} />
			</div>

			<div className="flex flex-col gap-4">
				{data.seasons.map((season) => {
					const totalMembers =
						season.memberCounts.yellow +
						season.memberCounts.green +
						season.memberCounts.red;

					return (
						<div
							className="rounded-4xl border border-border bg-card p-5"
							key={season.id}
						>
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<span className="font-semibold text-base">{season.name}</span>
								<span
									className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${STATUS_CLASSES[season.status]}`}
								>
									{STATUS_LABELS[season.status]}
								</span>
								<span className="ml-auto font-mono text-muted-foreground text-xs tabular-nums">
									{formatDate(new Date(season.startsAt))} –{" "}
									{formatDate(new Date(season.endsAt))}
								</span>
							</div>

							<div className="mb-4 flex gap-6 text-sm">
								<div>
									<span className="text-muted-foreground">QSO: </span>
									<span className="font-semibold tabular-nums">
										{season.qsoCount}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Nariai: </span>
									<span className="font-semibold tabular-nums">
										{totalMembers}
									</span>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								{TEAMS.map((team) => {
									const score = season.teamScores[team];
									const members = season.memberCounts[team];
									const totalScore =
										season.teamScores.yellow +
										season.teamScores.green +
										season.teamScores.red;
									const pct = totalScore > 0 ? (score / totalScore) * 100 : 0;

									return (
										<div className="flex items-center gap-3" key={team}>
											<div
												className={`size-2.5 shrink-0 rounded-full ${TEAM_DOT_CLASSES[team]}`}
											/>
											<span className="w-16 text-sm">{TEAM_LABELS[team]}</span>
											<div className="flex flex-1 items-center gap-2">
												<div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
													<div
														className={`h-full rounded-full ${TEAM_DOT_CLASSES[team]}`}
														style={{ width: `${pct}%` }}
													/>
												</div>
												<span className="w-16 text-right font-semibold text-sm tabular-nums">
													{score} t.
												</span>
											</div>
											<span className="w-14 text-right text-muted-foreground text-xs tabular-nums">
												{members} nar.
											</span>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}

				{data.seasons.length === 0 && (
					<p className="py-10 text-center text-muted-foreground text-sm">
						Nėra sezonų
					</p>
				)}
			</div>
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
}) {
	return (
		<div className="rounded-4xl border border-border bg-card p-4">
			<div className="mb-1 flex items-center gap-2">
				{icon}
				<span className="text-muted-foreground text-sm">{label}</span>
			</div>
			<span className="font-bold font-serif text-3xl tabular-nums">
				{value}
			</span>
		</div>
	);
}
