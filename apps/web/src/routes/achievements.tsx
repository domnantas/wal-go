import { Spinner } from "@WAL-GO/ui/components/spinner";
import { sessionOptions } from "@better-auth-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { ErrorPage } from "@/components/error-page";
import {
	AchievementStamp,
	type AchievementView,
} from "@/domains/profile/achievement-stamp";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/achievements")({
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

/** Section headings for the catalogue, in the order they read best. */
const GROUP_LABELS: Record<string, string> = {
	squares: "Teritorija",
	"season-squares": "Teritorija",
	qso: "Eterio darbas",
	callsigns: "Eterio darbas",
	points: "Eterio darbas",
	"qso-day-500": "Eterio darbas",
	confirmed: "Patvirtinimai",
	"confirmed-day-100": "Patvirtinimai",
	bands: "Diapazonai ir moduliacijos",
	"modes-all": "Diapazonai ir moduliacijos",
	streak: "Nuoseklumas",
	"season-active-days-20": "Nuoseklumas",
	night: "Nuoseklumas",
	"worked-all-teams": "Bendruomenė",
	"february-16": "Bendruomenė",
	tester: "Bendruomenė",
};

const SECTION_ORDER = [
	"Teritorija",
	"Eterio darbas",
	"Patvirtinimai",
	"Diapazonai ir moduliacijos",
	"Nuoseklumas",
	"Bendruomenė",
];

function groupIntoSections(achievements: AchievementView[]) {
	const sections = new Map<string, AchievementView[]>();
	for (const achievement of achievements) {
		const section = GROUP_LABELS[achievement.group] ?? "Kita";
		const existing = sections.get(section);
		if (existing) {
			existing.push(achievement);
		} else {
			sections.set(section, [achievement]);
		}
	}

	// An achievement whose group has no label lands in "Kita", which is not in
	// SECTION_ORDER — sort it last rather than letting indexOf's -1 hoist it
	// above "Teritorija".
	const rank = (section: string) => {
		const index = SECTION_ORDER.indexOf(section);
		return index === -1 ? Number.MAX_SAFE_INTEGER : index;
	};

	return [...sections.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const callsign = session.user.name;

	const {
		data: achievements,
		error,
		isPending,
		refetch,
	} = useQuery(orpc.profile.achievements.queryOptions({ input: { callsign } }));

	if (isPending) {
		return (
			<main className="container mx-auto flex max-w-5xl items-center justify-center px-4 py-16">
				<Spinner className="size-8" />
			</main>
		);
	}

	if (error) {
		const retryAchievements = async (): Promise<void> => {
			await refetch();
		};
		return <ErrorPage error={error} reset={retryAchievements} />;
	}

	const all = achievements ?? [];
	const earnedCount = all.filter(
		(achievement) => achievement.unlockedAt !== null
	).length;
	const percent = all.length ? Math.round((earnedCount / all.length) * 100) : 0;

	return (
		<main className="container mx-auto max-w-5xl px-4 py-12">
			<header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
				<div>
					<h1 className="font-bold font-serif text-4xl tracking-tight">
						Pasiekimai
					</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Surinkta{" "}
						<span className="font-mono font-semibold text-foreground tabular-nums">
							{earnedCount}
						</span>{" "}
						iš <span className="font-mono tabular-nums">{all.length}</span> ·{" "}
						<Link
							className="underline underline-offset-4"
							params={{ callsign }}
							to="/profile/$callsign"
						>
							{callsign}
						</Link>
					</p>
				</div>
				<div className="w-full max-w-56">
					<div
						aria-hidden="true"
						className="h-1.5 overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-olive"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="mt-2 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
						{percent}%
					</p>
				</div>
			</header>

			<div className="mt-10 flex flex-col gap-10">
				{groupIntoSections(all).map(([section, items]) => (
					<section key={section}>
						<div className="mb-4 flex items-baseline justify-between gap-4">
							<h2 className="font-bold font-serif text-xl">{section}</h2>
							<p className="font-mono text-muted-foreground text-xs tabular-nums">
								{
									items.filter((achievement) => achievement.unlockedAt !== null)
										.length
								}{" "}
								/ {items.length}
							</p>
						</div>
						<ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
							{items.map((achievement, index) => (
								<AchievementStamp
									achievement={achievement}
									index={index}
									key={achievement.id}
								/>
							))}
						</ul>
					</section>
				))}
			</div>
		</main>
	);
}
