import { buttonVariants } from "@WAL-GO/ui/components/button";
import { cn } from "@WAL-GO/ui/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DiscordIcon } from "@/components/discord-icon";
import { DISCORD_INVITE_URL } from "@/lib/constants";

const DISMISSED_STORAGE_KEY = "discord-community-box-dismissed";

export function DiscordCommunityBox() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(localStorage.getItem(DISMISSED_STORAGE_KEY) !== "true");
	}, []);

	const handleDismiss = () => {
		localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
		setIsVisible(false);
	};

	if (!isVisible) {
		return null;
	}

	return (
		<section className="relative border-border border-b px-5 py-4.5">
			<button
				aria-label="Užverti"
				className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				onClick={handleDismiss}
				type="button"
			>
				<X className="size-3.5" />
			</button>
			<p className="mb-1 pr-6 font-bold text-foreground text-sm">
				Prisijunk prie bendruomenės
			</p>
			<p className="mb-3 text-muted-foreground text-xs leading-relaxed">
				Aptark taisykles, susirask korespondentų ir sek naujienas Discord
				serveryje.
			</p>
			<a
				className={cn(buttonVariants({ size: "sm" }), "w-full")}
				href={DISCORD_INVITE_URL}
				rel="noopener noreferrer"
				target="_blank"
			>
				<DiscordIcon className="size-4" />
				Prisijungti prie Discord
			</a>
		</section>
	);
}
