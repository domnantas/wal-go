import { Settings } from "@WAL-GO/ui/components/settings/settings";
import { sessionOptions } from "@better-auth-ui/react";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";

const SETTINGS_PATHS = ["account", "security"] as const;

export const Route = createFileRoute("/settings/$path")({
	async beforeLoad({ context: { queryClient }, params: { path } }) {
		if (!(SETTINGS_PATHS as readonly string[]).includes(path)) {
			throw notFound();
		}
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
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
