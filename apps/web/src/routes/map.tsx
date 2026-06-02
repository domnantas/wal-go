import { sessionOptions } from "@better-auth-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { MapView } from "@/domains/map/map-view";
import { SelectedSquareStatsBox } from "@/domains/scoring/selected-square-stats-box";
import { TeamControlledSquaresBox } from "@/domains/scoring/team-controlled-squares-box";
import { SeasonSidebarBox } from "@/domains/season/season-sidebar-box";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/map")({
	async beforeLoad({ context: { queryClient } }) {
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		return { session };
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
	const activeSeason = useMemo(
		() => seasons?.find((s) => s.status === "active") ?? null,
		[seasons]
	);

	const { data: membership, isPending: isMembershipPending } = useQuery(
		orpc.seasons.myMembership.queryOptions()
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
		<main
			className="relative flex flex-col md:flex-row md:overflow-hidden"
			style={{ height: "calc(100dvh - var(--header-height))" }}
		>
			<div className="flex h-[60dvh] shrink-0 flex-col md:h-auto md:flex-1 md:shrink">
				<MapView
					onSquareSelect={setSelectedSquareCode}
					seasonId={displayedSeasonId}
					selectedSquareCode={selectedSquareCode}
				/>
			</div>
			<aside className="w-full overflow-y-auto border-border border-t bg-card md:w-70 md:shrink-0 md:border-t-0 md:border-l">
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
