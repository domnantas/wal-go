import { Auth } from "@WAL-GO/ui/components/auth/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

const AUTH_PATHS = [
	"sign-in",
	"sign-up",
	"forgot-password",
	"reset-password",
	"sign-out",
] as const;

export const Route = createFileRoute("/auth/$path")({
	beforeLoad({ params: { path } }) {
		if (!(AUTH_PATHS as readonly string[]).includes(path)) {
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
