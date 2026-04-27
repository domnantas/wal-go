import { UserButton } from "@WAL-GO/ui/components/user/user-button";
import { Link } from "@tanstack/react-router";
import { Map, NotebookPen, Trophy } from "lucide-react";
import walGoLogo from "@/assets/wal-go-logo-transparent.png";
import { authClient } from "@/lib/auth-client";

interface HeaderProps {
	session: { session: unknown; user: unknown } | null;
}

export default function Header({ session }: HeaderProps) {
	const { data: clientSession, isPending } = authClient.useSession();
	const isAuthenticated = isPending ? !!session : !!clientSession;
	const links = [
		{ to: "/map", label: "Žemėlapis", icon: Map, exact: false },
		{ to: "/log", label: "Žurnalas", icon: NotebookPen, exact: false },
		{
			to: "/leaderboard",
			label: "Rezultatai",
			icon: Trophy,
			exact: false,
		},
	] as const;

	return (
		<header className="border-border/60 border-b bg-card/50 backdrop-blur-sm">
			<div className="mx-auto flex items-center justify-between px-4 py-2">
				<div className="mr-4 flex w-full items-center justify-between gap-6">
					<Link to="/">
						<img
							alt="WAL GO logotipas"
							className="h-10 w-auto"
							src={walGoLogo}
						/>
					</Link>

					{isAuthenticated && (
						<nav className="flex gap-1">
							{links.map(({ to, label, icon: Icon, exact }) => (
								<Link
									activeOptions={{ exact }}
									className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
									key={to}
									to={to}
								>
									<Icon className="size-4" />
									{label}
								</Link>
							))}
						</nav>
					)}
				</div>

				<div className="flex items-center gap-2">
					<UserButton size="icon" />
				</div>
			</div>
		</header>
	);
}
