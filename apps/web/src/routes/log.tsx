import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/log")({
	beforeLoad({ context }) {
		if (!context.session) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/log"!</div>;
}
