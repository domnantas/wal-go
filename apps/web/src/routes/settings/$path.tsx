import { Settings } from "@WAL-GO/ui/components/settings/settings";
import { viewPaths } from "@better-auth-ui/react/core";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/settings/$path")({
	async beforeLoad({ params: { path } }) {
		if (!Object.values(viewPaths.settings).includes(path)) {
			throw notFound();
		}
		const session = await getUser();
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		return { session };
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
