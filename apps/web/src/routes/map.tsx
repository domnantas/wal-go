import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { MapView } from "@/domains/map/map-view";
import { SelectedSquareStatsBox } from "@/domains/scoring/selected-square-stats-box";
import { TeamControlledSquaresBox } from "@/domains/scoring/team-controlled-squares-box";
import { SeasonSidebarBox } from "@/domains/season/season-sidebar-box";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/map")({
	beforeLoad({ context }) {
		if (!context.session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	async loader({ context: { queryClient } }) {
		await Promise.all([
			queryClient.ensureQueryData(orpc.seasons.list.queryOptions()),
			queryClient.ensureQueryData(orpc.seasons.myMembership.queryOptions()),
		]);

		const seasons = queryClient.getQueryData(
			orpc.seasons.list.queryOptions().queryKey
		);
		const activeSeason = seasons?.find((s) => s.status === "active");
		const recentlyEndedSeason = seasons?.findLast((s) => s.status === "ended");
		const displayedSeasonId =
			activeSeason?.id ?? recentlyEndedSeason?.id ?? null;

		if (displayedSeasonId !== null) {
			await queryClient.ensureQueryData(
				orpc.scoring.teamStandings.queryOptions({
					input: { seasonId: displayedSeasonId },
				})
			);
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const [selectedSquareCode, setSelectedSquareCode] = useState<string | null>(
		null
	);

	const { data: seasons, isPending: areSeasonsPending } = useQuery(
		orpc.seasons.list.queryOptions()
	);
	const { data: membership, isPending: isMembershipPending } = useQuery(
		orpc.seasons.myMembership.queryOptions()
	);

	const activeSeason = useMemo(
		() => seasons?.find((s) => s.status === "active") ?? null,
		[seasons]
	);
	const upcomingSeason = useMemo(
		() => seasons?.find((s) => s.status === "upcoming") ?? null,
		[seasons]
	);
	const recentlyEndedSeason = useMemo(
		() => seasons?.findLast((s) => s.status === "ended") ?? null,
		[seasons]
	);

	const displayedSeasonId = activeSeason?.id ?? recentlyEndedSeason?.id ?? null;

	const handleSeasonTimingComplete = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.list.queryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.myMembership.queryOptions().queryKey,
		});
	}, [queryClient]);

	return (
		<main className="relative flex min-h-0 overflow-hidden">
			<MapView
				onSquareSelect={setSelectedSquareCode}
				seasonId={displayedSeasonId}
				selectedSquareCode={selectedSquareCode}
			/>
			<aside className="w-70 shrink-0 overflow-y-auto border-border border-l bg-card">
				<SeasonSidebarBox
					activeSeason={activeSeason}
					isLoading={areSeasonsPending}
					isMembershipLoading={isMembershipPending}
					membership={membership}
					onSeasonTimingComplete={handleSeasonTimingComplete}
					recentlyEndedSeason={recentlyEndedSeason}
					upcomingSeason={upcomingSeason}
				/>
				<TeamControlledSquaresBox seasonId={displayedSeasonId} />
				<SelectedSquareStatsBox
					seasonId={displayedSeasonId}
					selectedSquareCode={selectedSquareCode}
				/>
			</aside>
		</main>
	);
}
