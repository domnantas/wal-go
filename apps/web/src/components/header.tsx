import { Button } from "@WAL-GO/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { useSession } from "@better-auth-ui/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	BookOpen,
	Map as MapIcon,
	Menu,
	NotebookPen,
	Paintbrush,
	Shield,
	Trophy,
	UserPlus,
} from "lucide-react";
import walGoLogo from "@/assets/logo_512.png";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@/components/user-button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function Header() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: session } = useSession(authClient);
	const isAuthenticated = !!session?.user;
	const isAdmin = session?.user?.role === "admin";
	const { data: currentSeason } = useQuery({
		...orpc.seasons.current.queryOptions(),
		enabled: isAuthenticated,
	});
	const { data: membership, isPending: isMembershipPending } = useQuery({
		...orpc.seasons.myMembership.queryOptions(),
		enabled: isAuthenticated,
	});
	const { data: seasons } = useQuery({
		...orpc.seasons.list.queryOptions(),
		enabled: isAuthenticated,
	});
	const showJoinSeason =
		isAuthenticated && !!currentSeason && !isMembershipPending && !membership;
	const hasLeaderboardSeason = !!seasons?.some(
		(season) => season.status === "active" || season.status === "ended"
	);
	const baseAuthLinks = [
		{ to: "/map", label: "Žemėlapis", icon: MapIcon, exact: false },
		{ to: "/log", label: "Žurnalas", icon: NotebookPen, exact: false },
	] as const;
	const leaderboardLink = {
		to: "/leaderboard",
		label: "Rezultatai",
		icon: Trophy,
		exact: false,
	} as const;
	const authLinks = hasLeaderboardSeason
		? ([...baseAuthLinks, leaderboardLink] as const)
		: baseAuthLinks;
	const publicLinks = [
		{ to: "/rules", label: "Taisyklės", icon: BookOpen, exact: false },
	] as const;
	const allLinks = isAuthenticated
		? ([...authLinks, ...publicLinks] as const)
		: publicLinks;

	if (pathname === "/maintenance") {
		return null;
	}

	return (
		<header className="sticky top-0 z-50 border-border/60 border-b bg-card/50 backdrop-blur-sm">
			<div className="mx-auto flex h-(--header-height) items-center justify-between px-4">
				<div className="mr-4 flex w-full items-center justify-between gap-6">
					<Link to="/">
						<img
							alt="WAL GO logotipas"
							className="h-10 w-auto"
							src={walGoLogo}
						/>
					</Link>

					<nav className="hidden gap-1 md:flex">
						{allLinks.map(({ to, label, icon: Icon, exact }) => (
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
						{isAdmin && (
							<Link
								activeOptions={{ exact: false }}
								className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
								to="/admin"
							>
								<Shield className="size-4" />
								Admin
							</Link>
						)}
						{showJoinSeason && (
							<Button
								nativeButton={false}
								render={<Link to="/join-season" />}
								size="sm"
								variant="outline"
							>
								<UserPlus className="size-4" />
								Prisijungti prie sezono
							</Button>
						)}
					</nav>

					<DropdownMenu>
						<DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden">
							<Menu className="size-5" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{allLinks.map(({ to, label, icon: Icon, exact }) => (
								<DropdownMenuItem
									key={to}
									render={<Link activeOptions={{ exact }} to={to} />}
								>
									<Icon className="size-4" />
									{label}
								</DropdownMenuItem>
							))}
							{isAdmin && (
								<DropdownMenuItem
									render={<Link activeOptions={{ exact: false }} to="/admin" />}
								>
									<Shield className="size-4" />
									Admin
								</DropdownMenuItem>
							)}
							{showJoinSeason && (
								<DropdownMenuItem render={<Link to="/join-season" />}>
									<UserPlus className="size-4" />
									Prisijungti prie sezono
								</DropdownMenuItem>
							)}
							{!isAuthenticated && (
								<>
									<DropdownMenuSeparator />
									<div className="flex items-center justify-between px-3 py-1.5 font-medium text-sm">
										<div className="flex items-center gap-2.5">
											<Paintbrush className="size-4 text-muted-foreground" />
											Tema
										</div>
										<ThemeToggle />
									</div>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex items-center gap-2">
					{isAuthenticated ? (
						<UserButton />
					) : (
						<>
							<div className="hidden md:block">
								<ThemeToggle />
							</div>
							<Button
								nativeButton={false}
								render={<Link params={{ path: "sign-in" }} to="/auth/$path" />}
								size="sm"
							>
								Prisijungti
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
