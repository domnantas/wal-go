import { viewPaths } from "@better-auth-ui/react/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";

export const Route = createFileRoute("/auth/$pathname")({
	beforeLoad({ params: { pathname } }) {
		if (!Object.values(viewPaths.auth).includes(pathname)) {
			throw redirect({ to: "/" });
		}
	},
	component: AuthPage,
});

const TEAMS = [
	{
		id: "yellow",
		name: "Geltona",
		bg: "bg-yellow-bg",
		border: "border-yellow/25",
		dark: "text-yellow-dark",
		color: "text-yellow",
		count: 72,
	},
	{
		id: "green",
		name: "Žalia",
		bg: "bg-green-bg",
		border: "border-green/25",
		dark: "text-green-dark",
		color: "text-green",
		count: 91,
	},
	{
		id: "red",
		name: "Raudona",
		bg: "bg-red-bg",
		border: "border-red/25",
		dark: "text-red-dark",
		color: "text-red",
		count: 63,
	},
];

function AuthPage() {
	const { pathname } = Route.useParams();

	return (
		<div className="flex flex-1 overflow-hidden">
			{/* Left panel */}
			<div className="hidden md:flex w-[420px] shrink-0 flex-col justify-center items-center gap-8 px-12 py-16 bg-cream border-r border-border">
				<img
					src="/wal-go-logo-transparent.png"
					className="w-[180px] h-auto -mb-2"
					alt="WAL GO"
				/>
				<p className="font-serif text-[18px] text-brown2 text-center italic leading-[1.5]">
					Compete for radio territory across
					<br />
					the Lithuanian landscape
				</p>
				<div className="flex flex-col gap-[10px] w-full">
					{TEAMS.map((t) => (
						<div
							key={t.id}
							className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-[10px] border-[1.5px] ${t.bg} ${t.border}`}
						>
							<div>
								<div className={`font-bold text-sm ${t.dark}`}>{t.name}</div>
								<div className={`text-xs opacity-70 ${t.dark}`}>
									Team {t.name}
								</div>
							</div>
							<div className={`font-serif text-xl font-extrabold ${t.color}`}>
								{t.count}
							</div>
						</div>
					))}
					<p className="text-[11px] text-brown3 text-center mt-1">
						squares controlled this season
					</p>
				</div>
			</div>

			{/* Right panel */}
			<div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-cream2 overflow-y-auto">
				<Auth path={pathname} />
			</div>
		</div>
	);
}
