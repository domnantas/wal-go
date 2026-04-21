import { useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/account/$pathname")({
	component: AccountPage,
});

function AccountPage() {
	const { data } = useAuthenticate();
	const navigate = useNavigate();
	if (!data?.session) return null;

	if (!data.user.emailVerified) {
		navigate({ to: "/verify-email" });
		return null;
	}
	const user = data.user;

	return (
		<div className="w-full h-full overflow-y-auto px-8 py-7 bg-cream">
			<div className="w-full max-w-[520px] mx-auto">
				<h1 className="font-serif text-2xl font-bold text-brown mb-6">
					Profilis
				</h1>
				{user && (
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border">
							<div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-green">
								{(user.name ?? user.email ?? "?")[0].toUpperCase()}
							</div>
							<div>
								<div className="font-semibold text-brown">
									{user.name ?? "—"}
								</div>
								<div className="text-sm text-brown3">
									{user.email}
								</div>
							</div>
						</div>
						<button
							onClick={() => authClient.signOut()}
							className="w-full py-3 bg-brown text-white rounded-lg font-semibold text-[15px] hover:opacity-90 transition-opacity cursor-pointer border-none"
						>
							Atsijungti
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
