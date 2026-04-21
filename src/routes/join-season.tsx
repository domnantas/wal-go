import { useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/join-season")({
	component: JoinSeasonPage,
});

const TEAMS = [
	{
		name: "Geltona",
		bg: "bg-yellow-bg",
		border: "border-yellow/25",
		dark: "text-yellow-dark",
	},
	{
		name: "Žalia",
		bg: "bg-green-bg",
		border: "border-green/25",
		dark: "text-green-dark",
	},
	{
		name: "Raudona",
		bg: "bg-red-bg",
		border: "border-red/25",
		dark: "text-red-dark",
	},
];

function JoinSeasonPage() {
	const { data } = useAuthenticate();
	const navigate = useNavigate();
	if (!data?.session) return null;

	if (!data.user.emailVerified) {
		navigate({ to: "/verify-email" });
		return null;
	}

	return (
		<div className="min-h-full flex items-center justify-center flex-col bg-cream p-10">
			<div className="text-center mb-10">
				<h1 className="font-serif text-4xl mb-2">
					Prisijungti prie sezono
				</h1>
				<p className="text-brown2 text-base max-w-[420px] mx-auto">
					Sukite ruletę ir sužinokite, kuriai komandai priklausote. Komanda
					bus priskirta vienąkart ir nekeičiama.
				</p>
			</div>

			<div className="flex gap-4 mb-8 justify-center">
				{TEAMS.map((team) => (
					<div
						key={team.name}
						className={`${team.bg} rounded-xl px-5 py-4 border-[1.5px] ${team.border} text-center min-w-[100px]`}
					>
						<div className={`font-bold text-[15px] ${team.dark}`}>
							{team.name}
						</div>
					</div>
				))}
			</div>

			<button className="px-12 py-3.5 bg-brown text-white rounded-full text-[17px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.985] cursor-pointer border-none">
				Sukti ruletę
			</button>
		</div>
	);
}
