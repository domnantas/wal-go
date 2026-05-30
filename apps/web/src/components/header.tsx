import { Button } from "@WAL-GO/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	Map as MapIcon,
	Menu,
	NotebookPen,
	Paintbrush,
	Shield,
	UserPlus,
} from "lucide-react";
import walGoLogo from "@/assets/wal-go-logo-transparent.png";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@/components/user-button";
import { authClient } from "@/lib/auth-client";
import type { SessionContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

interface HeaderProps {
	session: SessionContext;
}

export default function Header({ session: initialSession }: HeaderProps) {
	const { data: clientSession, isPending } = authClient.useSession();
	const isAuthenticated = isPending ? !!initialSession : !!clientSession;
	const session = isPending ? initialSession : clientSession;
	const isAdmin = session?.user?.role === "admin";
	const currentSeason = useQuery({
		...orpc.seasons.current.queryOptions(),
		enabled: isAuthenticated,
	});
	const membership = useQuery({
		...orpc.seasons.myMembership.queryOptions(),
		enabled: isAuthenticated,
	});
	const showJoinSeason =
		isAuthenticated && !!currentSeason.data && !membership.data;
	const authLinks = [
		{ to: "/map", label: "Žemėlapis", icon: MapIcon, exact: false },
		{ to: "/log", label: "Žurnalas", icon: NotebookPen, exact: false },
	] as const;
	const publicLinks = [
		{ to: "/rules", label: "Taisyklės", icon: BookOpen, exact: false },
	] as const;
	const allLinks = isAuthenticated
		? ([...authLinks, ...publicLinks] as const)
		: publicLinks;

	return (
		<header className="sticky top-0 z-50 border-border/60 border-b bg-card/50 backdrop-blur-sm">
			<div className="mx-auto flex items-center justify-between px-4 py-2">
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
						<UserButton session={initialSession} />
					) : (
						<>
							<div className="hidden md:block">
								<ThemeToggle />
							</div>
							<Button
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
