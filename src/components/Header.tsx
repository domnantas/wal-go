import { Link } from "@tanstack/react-router";
import { authClient } from "../lib/auth";
import { UserButton } from "./user/user-button";

export default function Header() {
	const { data } = authClient.useSession();
	const session = data?.session;

	return (
		<header className="h-14 bg-white border-b border-border flex items-center px-5 gap-4 shrink-0 shadow-[0_1px_4px_rgba(28,16,7,0.05)]">
			<Link to="/" activeProps={{}}>
				<img
					src="/wal-go-logo-transparent.png"
					alt="WAL GO"
					className="h-7 w-auto"
				/>
			</Link>

			<nav className="flex gap-1 ml-auto mr-2">
				<Link
					to="/"
					className="px-3.5 py-1.5 rounded-md text-sm font-medium text-brown2 flex items-center gap-1.5 transition-colors hover:bg-cream2 hover:text-brown no-underline data-[status=active]:bg-cream2 data-[status=active]:text-brown data-[status=active]:font-semibold"
					activeOptions={{ exact: true }}
				>
					Žemėlapis
				</Link>
				{session && (
					<Link
						to="/log"
						className="px-3.5 py-1.5 rounded-md text-sm font-medium text-brown2 flex items-center gap-1.5 transition-colors hover:bg-cream2 hover:text-brown no-underline data-[status=active]:bg-cream2 data-[status=active]:text-brown data-[status=active]:font-semibold"
					>
						Žurnalas
					</Link>
				)}
			</nav>

			{session ? (
				<UserButton />
			) : (
				<div className="flex gap-2">
					<Link
						to="/auth/$pathname"
						params={{ pathname: "sign-in" }}
						className="px-3.5 py-1.5 rounded-md text-sm font-medium text-brown2 flex items-center gap-1.5 transition-colors hover:bg-cream2 hover:text-brown no-underline"
					>
						Prisijungti
					</Link>
					<Link
						to="/auth/$pathname"
						params={{ pathname: "sign-up" }}
						className="py-1.5 px-4 bg-brown text-white rounded-md text-sm font-semibold no-underline flex items-center hover:opacity-90 transition-opacity"
					>
						Registruotis
					</Link>
				</div>
			)}
		</header>
	);
}
