import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/leaderboard")({
	beforeLoad({ context }) {
		if (!context.session) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/leaderboard"!</div>;
}
