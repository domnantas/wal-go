import { Auth } from "@WAL-GO/ui/components/auth/auth";
import { viewPaths } from "@better-auth-ui/react/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/$path")({
	beforeLoad({ params: { path } }) {
		if (
			!Object.values(viewPaths.auth)
				.filter((path) => path !== "magic-link")
				.includes(path)
		) {
			throw redirect({ to: "/" });
		}
	},
	component: AuthPage,
});

function AuthPage() {
	const { path } = Route.useParams();

	return (
		<div className="my-auto flex justify-center p-4 md:p-6">
			<Auth path={path} />
		</div>
	);
}
