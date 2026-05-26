import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LogOut, Paintbrush, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import type { SessionContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

type Team = "yellow" | "green" | "red";

const TEAM_PILL_CLASSES: Record<Team, string> = {
	yellow: "border-golden",
	green: "border-olive",
	red: "border-rust",
};

interface UserButtonProps {
	session: SessionContext;
}

function DiscordIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963a.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028ZM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38Zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38Z" />
		</svg>
	);
}

export function UserButton({ session: initialSession }: UserButtonProps) {
	const { data: clientSession, isPending } = authClient.useSession();
	const session = isPending ? initialSession : clientSession;
	const { data: membership } = useQuery({
		...orpc.seasons.myMembership.queryOptions(),
		enabled: !!session,
	});

	if (!session) {
		return null;
	}

	const callsign = session.user.name;
	const team = membership?.team as Team | undefined;

	const pillBorder = team ? TEAM_PILL_CLASSES[team] : "border-border";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"inline-flex items-center rounded-full border-2 bg-card px-3 py-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
					pillBorder
				)}
			>
				<span className="font-semibold text-foreground text-sm">
					{callsign}
				</span>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" sideOffset={6}>
				<DropdownMenuItem
					className="cursor-pointer"
					render={<Link params={{ path: "account" }} to="/settings/$path" />}
				>
					<Settings className="text-muted-foreground" />
					Nustatymai
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<div className="flex items-center justify-between px-3 py-1.5 font-medium text-sm">
					<div className="flex items-center gap-2.5">
						<Paintbrush className="size-4 text-muted-foreground" />
						Tema
					</div>
					<ThemeToggle />
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className={cn(
						"cursor-pointer text-indigo-500 focus:text-accent-foreground dark:text-indigo-400 dark:focus:text-accent-foreground"
					)}
					render={
						<a
							href="https://discord.gg/RQfcQ29d44"
							rel="noopener noreferrer"
							target="_blank"
						/>
					}
				>
					<DiscordIcon className="size-4" />
					Discord
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="cursor-pointer"
					render={<Link params={{ path: "sign-out" }} to="/auth/$path" />}
				>
					<LogOut className="text-muted-foreground" />
					Atsijungti
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
