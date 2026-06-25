import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@WAL-GO/ui/components/select";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@WAL-GO/ui/components/table";
import { sessionOptions } from "@better-auth-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { MapView } from "@/domains/map/map-view";
import { ControlTimelineChart } from "@/domains/season/control-timeline-chart";
import { SeasonWinnerHero } from "@/domains/season/season-winner-hero";
import { TEAM_CONFIG, type Team } from "@/domains/season/team";
import { TeamStandingCard } from "@/domains/season/team-standing-card";
import { useWinnerConfetti } from "@/domains/season/use-winner-confetti";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { formatInVilnius } from "@/lib/date";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/leaderboard")({
	async beforeLoad({ context: { queryClient } }) {
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		return { session };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: seasons, isPending: isSeasonsPending } = useQuery(
		orpc.seasons.list.queryOptions()
	);

	const endedSeasons = [...(seasons ?? [])]
		.filter((season) => season.status === "ended")
		.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

	const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
	const [selectedSquareCode, setSelectedSquareCode] = useState<string | null>(
		null
	);
	const activeSeasonId = selectedSeasonId ?? endedSeasons[0]?.id ?? null;
	const selectedSeason =
		endedSeasons.find((season) => season.id === activeSeasonId) ?? null;

	const { data: teamStandings } = useQuery({
		...orpc.scoring.teamStandings.queryOptions({
			input: { seasonId: activeSeasonId ?? undefined },
		}),
		enabled: activeSeasonId !== null,
	});
	const { data: individualStandings } = useQuery({
		...orpc.scoring.individualStandings.queryOptions({
			input: { seasonId: activeSeasonId ?? undefined },
		}),
		enabled: activeSeasonId !== null,
	});

	const standings = teamStandings ?? [];
	const winner = standings[0];

	useWinnerConfetti(activeSeasonId, true);

	if (isSeasonsPending) {
		return (
			<main className="container mx-auto flex max-w-4xl items-center justify-center px-4 py-16">
				<Spinner className="size-8" />
			</main>
		);
	}

	if (endedSeasons.length === 0 || !selectedSeason) {
		return (
			<main className="container mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center">
				<Trophy className="mb-4 size-10 text-muted-foreground" />
				<h1 className="font-bold font-serif text-2xl">Rezultatai</h1>
				<p className="mt-2 text-muted-foreground">
					Dar nėra pasibaigusių sezonų.
				</p>
			</main>
		);
	}

	return (
		<main className="container mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
						Sezono rezultatai
					</p>
					<h1 className="mt-2 font-bold font-serif text-4xl tracking-tight">
						{selectedSeason.name}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Baigėsi {formatInVilnius(selectedSeason.endsAt, "yyyy-MM-dd HH:mm")}
					</p>
				</div>
				{endedSeasons.length > 1 && (
					<Select
						onValueChange={(value) => setSelectedSeasonId(Number(value))}
						value={String(selectedSeason.id)}
					>
						<SelectTrigger className="w-56">
							<SelectValue>{() => selectedSeason.name}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{endedSeasons.map((season) => (
								<SelectItem key={season.id} value={String(season.id)}>
									{season.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{winner && (
				<SeasonWinnerHero
					points={winner.points}
					squaresControlled={winner.squaresControlled}
					team={winner.team as Team}
				/>
			)}

			<div className="flex h-96 overflow-hidden rounded-3xl border border-border">
				<MapView
					onSquareSelect={setSelectedSquareCode}
					seasonId={activeSeasonId}
					selectedSquareCode={selectedSquareCode}
				/>
			</div>

			<ControlTimelineChart seasonId={activeSeasonId} />

			<section>
				<h2 className="mb-3 font-bold font-serif text-xl">Komandos</h2>
				<div className="grid gap-3 md:grid-cols-3">
					{standings.map((team) => (
						<TeamStandingCard
							key={team.team}
							points={team.points}
							showPoints
							squaresControlled={team.squaresControlled}
							team={team.team as Team}
						/>
					))}
				</div>
			</section>

			<section>
				<h2 className="mb-3 font-bold font-serif text-xl">
					Individualūs rezultatai
				</h2>
				<div className="overflow-x-auto rounded-4xl border border-border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">#</TableHead>
								<TableHead>Šaukinys</TableHead>
								<TableHead>Komanda</TableHead>
								<TableHead className="w-24 text-right">Taškai</TableHead>
								<TableHead className="w-24 text-right">QSO</TableHead>
								<TableHead className="w-24 text-right">
									Aplankyti kvadratai
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(individualStandings ?? []).map((row, index) => {
								const config = TEAM_CONFIG[row.team as Team];
								return (
									<TableRow key={row.userId}>
										<TableCell className="font-mono text-muted-foreground">
											{index + 1}
										</TableCell>
										<TableCell className="font-mono font-semibold">
											{row.callsign}
										</TableCell>
										<TableCell>
											<span className="flex items-center gap-2">
												<span
													className={`size-2.5 rounded-full ${config.dot}`}
												/>
												{config.label}
											</span>
										</TableCell>
										<TableCell className="text-right font-semibold">
											{row.points}
										</TableCell>
										<TableCell className="text-right text-muted-foreground">
											{row.qsoCount}
										</TableCell>
										<TableCell className="text-right text-muted-foreground">
											{row.squaresWorked}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					{(individualStandings ?? []).length === 0 && (
						<p className="px-5 py-8 text-center text-muted-foreground text-sm">
							Šį sezoną taškų dar nesurinkta.
						</p>
					)}
				</div>
			</section>
		</main>
	);
}
