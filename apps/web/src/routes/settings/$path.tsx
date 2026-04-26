import { Settings } from "@WAL-GO/ui/components/settings/settings";
import { viewPaths } from "@better-auth-ui/react/core";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/$path")({
	beforeLoad({ context, params: { path } }) {
		if (!Object.values(viewPaths.settings).includes(path)) {
			throw notFound();
		}
		if (!context.session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: SettingsPage,
});

function SettingsPage() {
	const { path } = Route.useParams();

	return (
		<div className="mx-auto w-full max-w-3xl p-4 md:p-6">
			<Settings path={path} />
		</div>
	);
}
