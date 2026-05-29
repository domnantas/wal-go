import { Button } from "@WAL-GO/ui/components/button";
import { DISCORD_INVITE_URL } from "@/lib/constants";
import { DiscordIcon } from "./discord-icon";

interface ErrorPageProps {
	error: Error;
	reset: () => void;
}

export function ErrorPage({ error, reset }: ErrorPageProps) {
	return (
		<main className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
			<span className="font-mono text-muted-foreground text-sm">Klaida</span>
			<h1 className="font-bold font-serif text-3xl">Kažkas ne taip 😟</h1>
			<p className="max-w-sm text-muted-foreground">
				Įvyko netikėta klaida. Bandykite perkrauti puslapį arba praneškite apie
				problemą Discord.
			</p>
			{error.message ? (
				<pre className="max-w-md overflow-x-auto rounded-2xl border border-border bg-muted px-4 py-3 text-left font-mono text-muted-foreground text-xs">
					{error.message}
				</pre>
			) : null}
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button onClick={reset} variant="outline">
					Bandyti dar kartą
				</Button>
				<Button
					render={
						// biome-ignore lint/a11y/useAnchorContent: children rendered by Button primitive
						<a
							href={DISCORD_INVITE_URL}
							rel="noopener noreferrer"
							target="_blank"
						/>
					}
					variant="outline"
				>
					<DiscordIcon className="size-4" />
					Pranešti Discord
				</Button>
			</div>
		</main>
	);
}
