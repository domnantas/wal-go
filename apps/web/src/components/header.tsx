import { UserButton } from "@WAL-GO/ui/components/user/user-button";
import { Link } from "@tanstack/react-router";
import walGoLogo from "@/assets/wal-go-logo-transparent.png";

export default function Header() {
	const links = [
		{ to: "/", label: "Pradžia", exact: true },
		{ to: "/dashboard", label: "Informacija", exact: false },
	] as const;

	return (
		<header className="border-border/60 border-b bg-card/50 backdrop-blur-sm">
			<div className="container mx-auto flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-6">
					<Link to="/">
						<img
							alt="WAL GO logotipas"
							className="h-10 w-auto"
							src={walGoLogo}
						/>
					</Link>

					<nav className="flex gap-1">
						{links.map(({ to, label, exact }) => (
							<Link
								activeOptions={{ exact }}
								className="rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
								key={to}
								to={to}
							>
								{label}
							</Link>
						))}
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<UserButton size="icon" />
				</div>
			</div>
		</header>
	);
}
