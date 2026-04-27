import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@WAL-GO/ui/components/tabs";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LogOut, Monitor, Moon, Paintbrush, Settings, Sun } from "lucide-react";
import { useTheme } from "tanstack-theme-kit";
import { authClient } from "@/lib/auth-client";
import type { SessionContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

type Team = "yellow" | "green" | "red";

const TEAM_PILL_CLASSES: Record<Team, string> = {
	yellow: "border-golden",
	green: "border-olive",
	red: "border-rust",
};

const TEAM_AVATAR_CLASSES: Record<Team, string> = {
	yellow: "bg-golden text-golden-foreground",
	green: "bg-olive text-olive-foreground",
	red: "bg-rust text-rust-foreground",
};

interface UserButtonProps {
	session: SessionContext;
}

export function UserButton({ session: initialSession }: UserButtonProps) {
	const { data: clientSession, isPending } = authClient.useSession();
	const session = isPending ? initialSession : clientSession;
	const { data: membership } = useQuery({
		...orpc.seasons.myMembership.queryOptions(),
		enabled: !!session,
	});
	const { theme, setTheme } = useTheme();

	if (!session) {
		return null;
	}

	const callsign = session.user.name;
	const initials = callsign.slice(0, 2).toUpperCase();
	const team = membership?.team as Team | undefined;

	const pillBorder = team ? TEAM_PILL_CLASSES[team] : "border-border";
	const avatarColors = team
		? TEAM_AVATAR_CLASSES[team]
		: "bg-muted text-muted-foreground";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"inline-flex items-center gap-2 rounded-full border-2 bg-card py-1 pr-3 pl-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
					pillBorder
				)}
			>
				<span
					className={cn(
						"flex size-7 items-center justify-center rounded-full font-bold text-xs",
						avatarColors
					)}
				>
					{initials}
				</span>
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
					<Tabs
						className="ml-4"
						onValueChange={setTheme}
						value={theme ?? "system"}
					>
						<TabsList className="h-6! gap-0.5">
							<TabsTrigger
								aria-label="Sistemos"
								className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
								value="system"
							>
								<Monitor className="size-3" />
							</TabsTrigger>
							<TabsTrigger
								aria-label="Šviesi"
								className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
								value="light"
							>
								<Sun className="size-3" />
							</TabsTrigger>
							<TabsTrigger
								aria-label="Tamsi"
								className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
								value="dark"
							>
								<Moon className="size-3" />
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

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
