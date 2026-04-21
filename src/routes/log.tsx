import { useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/log")({ component: LogPage });

function LogPage() {
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
					<h2 className="font-serif text-2xl mb-1">QSO žurnalas</h2>
					<p className="text-brown3 text-sm">
						Įkelkite ADIF failą ir peržiūrėkite savo QSO
					</p>
				</div>
			</div>

			<div
				className="border-2 border-dashed border-border rounded-lg p-8 text-center text-brown3 bg-cream2 cursor-pointer transition-all mb-5 hover:border-ring hover:bg-ring/5 hover:text-ring data-[dragging]:border-ring data-[dragging]:bg-ring/5 data-[dragging]:text-ring"
				onDragOver={(e) => {
					e.preventDefault();
					e.currentTarget.dataset.dragging = "";
				}}
				onDragLeave={(e) => {
					delete e.currentTarget.dataset.dragging;
				}}
				onDrop={(e) => {
					e.preventDefault();
					delete e.currentTarget.dataset.dragging;
				}}
			>
				<div className="text-[32px] mb-2">📂</div>
				<p className="text-sm font-medium mt-2">
					Vilkite .adi / .adif failą čia
				</p>
				<span className="text-xs opacity-70">
					arba{" "}
					<label className="text-ring cursor-pointer font-semibold">
						pasirinkite failą
						<input
							type="file"
							accept=".adi,.adif"
							className="hidden"
						/>
					</label>
				</span>
			</div>

			<div className="grid grid-cols-4 max-sm:grid-cols-2 gap-3.5 mb-6">
				{[
					{ val: "0", lbl: "Viso QSO" },
					{ val: "0", lbl: "Taškai" },
					{ val: "0", lbl: "WAL kvadratai" },
					{ val: "0", lbl: "Įkėlimai" },
				].map((s) => (
					<div
						key={s.lbl}
						className="bg-white rounded-lg px-[18px] py-4 border border-border shadow-card"
					>
						<div className="text-[28px] font-bold font-serif text-brown leading-none">
							{s.val}
						</div>
						<div className="text-xs text-brown3 mt-1 font-medium">
							{s.lbl}
						</div>
					</div>
				))}
			</div>

			<div className="bg-white rounded-lg border border-border overflow-hidden shadow-card">
				<div className="px-5 py-15 text-center text-brown3">
					<div className="text-5xl mb-3">📋</div>
					<h3 className="font-serif text-lg mb-1.5 text-brown2">
						Žurnalas tuščias
					</h3>
					<p className="text-sm">
						Įkelkite ADIF failą, kad pradėtumėte
					</p>
				</div>
			</div>
		</div>
	);
}
