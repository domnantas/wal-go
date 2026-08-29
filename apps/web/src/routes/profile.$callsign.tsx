import { Spinner } from "@WAL-GO/ui/components/spinner";
import { sessionOptions } from "@better-auth-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { RadioTower } from "lucide-react";

import { ErrorPage } from "@/components/error-page";
import { ProfileAchievements } from "@/domains/profile/profile-achievements";
import { ProfileDistribution } from "@/domains/profile/profile-distribution";
import { ProfileHeader } from "@/domains/profile/profile-header";
import { ProfileMap } from "@/domains/profile/profile-map";
import { ProfileRecentQsos } from "@/domains/profile/profile-recent-qsos";
import { ProfileStats } from "@/domains/profile/profile-stats";
import type { Team } from "@/domains/season/team";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/** Stable identity so the map overlay doesn't churn while squares load. */
const NO_SQUARES: string[] = [];

export const Route = createFileRoute("/profile/$callsign")({
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
	const { callsign } = Route.useParams();
	const { session } = Route.useRouteContext();
	const input = { callsign };

	const {
		data: profile,
		error: profileError,
		isPending: isProfilePending,
	} = useQuery(orpc.profile.get.queryOptions({ input }));
	const {
		data: squares,
		error: squaresError,
		isPending: isSquaresPending,
		refetch: refetchSquares,
	} = useQuery(orpc.profile.squares.queryOptions({ input }));
	const {
		data: distribution,
		error: distributionError,
		isPending: isDistributionPending,
		refetch: refetchDistribution,
	} = useQuery(orpc.profile.distribution.queryOptions({ input }));
	const {
		data: achievements,
		error: achievementsError,
		isPending: isAchievementsPending,
		refetch: refetchAchievements,
	} = useQuery(orpc.profile.achievements.queryOptions({ input }));
	const {
		data: recentQsos,
		error: recentQsosError,
		isPending: isRecentQsosPending,
		refetch: refetchRecentQsos,
	} = useQuery(orpc.profile.recentQsos.queryOptions({ input }));

	const isPending =
		isProfilePending ||
		isSquaresPending ||
		isDistributionPending ||
		isAchievementsPending ||
		isRecentQsosPending;

	if (isPending) {
		return (
			<main className="container mx-auto flex max-w-5xl items-center justify-center px-4 py-16">
				<Spinner className="size-8" />
			</main>
		);
	}

	if (profileError || !profile) {
		return (
			<main className="container mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center">
				<RadioTower className="mb-4 size-10 text-muted-foreground" />
				<h1 className="font-bold font-serif text-2xl">Operatorius nerastas</h1>
				<p className="mt-2 text-muted-foreground">
					Operatorius šaukiniu <span className="font-mono">{callsign}</span> WAL
					GO žaidime nedalyvauja.
				</p>
			</main>
		);
	}

	const secondaryError =
		squaresError ?? distributionError ?? achievementsError ?? recentQsosError;
	if (secondaryError) {
		const retryProfileData = async (): Promise<void> => {
			await Promise.all([
				refetchSquares(),
				refetchDistribution(),
				refetchAchievements(),
				refetchRecentQsos(),
			]);
		};
		return <ErrorPage error={secondaryError} reset={retryProfileData} />;
	}

	const team = (profile.currentSeason?.team ?? null) as Team | null;
	const isOwnProfile =
		session.user.name.toUpperCase() === profile.callsign.toUpperCase();

	return (
		<main className="container mx-auto max-w-5xl px-4 py-10">
			<ProfileHeader
				callsign={profile.callsign}
				currentSeason={
					profile.currentSeason
						? { name: profile.currentSeason.name, team: team as Team }
						: null
				}
				image={profile.image}
				memberSince={profile.memberSince}
			/>

			<div className="flex flex-col gap-8">
				<ProfileMap
					allTimeSquares={squares?.allTime ?? NO_SQUARES}
					isPending={false}
					seasonId={profile.currentSeason?.id ?? null}
					seasonName={profile.currentSeason?.name ?? null}
					seasonSquares={squares?.season ?? NO_SQUARES}
					team={team}
				/>

				<ProfileStats career={profile.career} season={profile.seasonStat} />

				<ProfileDistribution
					bands={distribution?.bands ?? []}
					modes={distribution?.modes ?? []}
				/>

				{achievements && (
					<ProfileAchievements
						achievements={achievements}
						isOwnProfile={isOwnProfile}
					/>
				)}

				<ProfileRecentQsos qsos={recentQsos ?? []} />
			</div>
		</main>
	);
}
