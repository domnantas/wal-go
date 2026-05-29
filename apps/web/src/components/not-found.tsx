import { Button } from "@WAL-GO/ui/components/button";
import { Link } from "@tanstack/react-router";
import { DISCORD_INVITE_URL } from "@/lib/constants";
import { DiscordIcon } from "./discord-icon";

export function NotFound() {
	return (
		<main className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
			<span className="font-mono text-muted-foreground text-sm">404</span>
			<h1 className="font-bold font-serif text-3xl">Puslapis nerastas</h1>
			<p className="max-w-sm text-muted-foreground">
				Toks puslapis neegzistuoja arba buvo perkeltas.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button render={<Link to="/" />} variant="outline">
					Grįžti į pradžią
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
					Discord
				</Button>
			</div>
		</main>
	);
}
