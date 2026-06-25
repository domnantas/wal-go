import { Link, useRouterState } from "@tanstack/react-router";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "wal-go-rule-change-banner";
const BANNER_VERSION = "beta-2026-06";

export function RuleChangeBanner() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

	useEffect(() => {
		setIsDismissed(localStorage.getItem(DISMISS_KEY) === BANNER_VERSION);
	}, []);

	if (pathname === "/maintenance" || isDismissed !== false) {
		return null;
	}

	const handleDismiss = () => {
		localStorage.setItem(DISMISS_KEY, BANNER_VERSION);
		setIsDismissed(true);
	};

	return (
		<div className="border-border/60 border-b bg-primary/10">
			<div className="mx-auto flex items-center gap-3 px-4 py-2.5">
				<Megaphone className="size-4 shrink-0 text-primary" />
				<p className="min-w-0 text-sm">
					Atnaujinome beta sezono taisykles.{" "}
					<Link
						className="font-medium underline underline-offset-2"
						to="/rules"
					>
						Peržiūrėk pakeitimus
					</Link>
					.
				</p>
				<button
					aria-label="Užverti pranešimą"
					className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onClick={handleDismiss}
					type="button"
				>
					<X className="size-4" />
				</button>
			</div>
		</div>
	);
}
