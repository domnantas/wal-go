import { useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/seasons")({
	component: AdminSeasonsPage,
});

function AdminSeasonsPage() {
	const { data } = useAuthenticate();
	const navigate = useNavigate();
	if (!data?.session) return null;

	if (!data.user.emailVerified) {
		navigate({ to: "/verify-email" });
		return null;
	}

	return (
		<div className="w-full h-full overflow-y-auto px-8 py-7 bg-cream">
			<div className="flex items-start justify-between mb-6">
				<div>
					<h2 className="font-serif text-2xl mb-1">Sezonai</h2>
					<p className="text-brown3 text-sm">
						Administruokite sezono datas ir nustatymus
					</p>
				</div>
				<button
					type="button"
					className="px-5 py-2.5 bg-brown text-white rounded-md text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 active:scale-[0.985] cursor-pointer border-none"
				>
					+ Naujas sezonas
				</button>
			</div>
			<div className="bg-white rounded-lg border border-border overflow-hidden shadow-card">
				<div className="px-5 py-15 text-center text-brown3">
					<div className="text-5xl mb-3">📅</div>
					<h3 className="font-serif text-lg mb-1.5 text-brown2">
						Sezonų nėra
					</h3>
					<p className="text-sm">Sukurkite pirmąjį sezoną</p>
				</div>
			</div>
		</div>
	);
}
