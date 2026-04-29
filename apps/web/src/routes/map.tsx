import { createFileRoute, redirect } from "@tanstack/react-router";
import { MapView } from "@/domains/map/map-view";
import { TeamControlledSquaresBox } from "@/domains/scoring/team-controlled-squares-box";
import { SeasonProgressBox } from "@/domains/season/season-progress-box";

export const Route = createFileRoute("/map")({
	beforeLoad({ context }) {
		if (!context.session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="relative flex min-h-0 overflow-hidden">
			<MapView />
			<aside className="w-70 shrink-0 overflow-y-auto border-border border-l bg-card">
				<SeasonProgressBox />
				<TeamControlledSquaresBox />
			</aside>
		</main>
	);
}
