import { UserButton } from "@WAL-GO/ui/components/user/user-button";
import { Link } from "@tanstack/react-router";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div className="flex flex-row items-center justify-between border-border border-b px-2 py-1">
			<nav className="flex gap-4 text-lg">
				{links.map(({ to, label }) => (
					<Link key={to} to={to}>
						{label}
					</Link>
				))}
			</nav>
			<div className="flex items-center gap-2">
				<UserButton size="icon" />
			</div>
		</div>
	);
}
