import { createFileRoute } from "@tanstack/react-router";
import walGoLogo from "@/assets/logo_512.png";
import { DISCORD_INVITE_URL } from "@/lib/constants";

export const Route = createFileRoute("/maintenance")({
	head: () => ({
		meta: [
			{ title: "Techninė priežiūra — WAL GO" },
			{ name: "robots", content: "noindex" },
		],
	}),
	component: MaintenanceComponent,
});

function MaintenanceComponent() {
	return (
		<main className="grid min-h-dvh place-items-center px-6 py-12">
			<div className="flex w-full max-w-md flex-col items-center gap-6 rounded-4xl border border-border bg-card px-8 py-10 text-center shadow-lg">
				<img alt="WAL GO" className="w-44 max-w-[70%]" src={walGoLogo} />
				<div className="h-[3px] w-12 rounded-full bg-golden" />
				<h1 className="font-bold font-serif text-3xl">Techninė problema</h1>
				<p className="text-muted-foreground leading-relaxed">
					WAL GO laikinai nepasiekiamas. Sekite naujienas Discord bendruomenėje.
				</p>
				<a
					className="inline-flex items-center gap-2 rounded-md bg-rust px-5 py-2.5 font-semibold text-rust-foreground text-sm transition-opacity hover:opacity-90"
					href={DISCORD_INVITE_URL}
					rel="noopener"
					target="_blank"
				>
					<svg
						aria-hidden="true"
						className="size-5"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.6-.717 1.385-.98 2.003a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.997-2.003.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C1.533 7.55.954 10.64 1.24 13.69a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.349-1.225.645-1.873.891a.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-3.527-.838-6.59-3.549-9.305a.06.06 0 0 0-.031-.028ZM8.02 12.332c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
					</svg>
					Prisijunk prie Discord
				</a>
			</div>
		</main>
	);
}
