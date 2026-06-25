import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { useAuth, useRevokeSession, useSession } from "@better-auth-ui/react";
import type { Session } from "better-auth";
import Bowser from "bowser";
import { LogOut, Monitor, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

function timeAgo(date: Date) {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

	const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
		["year", 31_536_000],
		["month", 2_592_000],
		["week", 604_800],
		["day", 86_400],
		["hour", 3600],
		["minute", 60],
		["second", 1],
	];

	for (const [unit, threshold] of UNITS) {
		if (seconds >= threshold) {
			return rtf.format(-Math.floor(seconds / threshold), unit);
		}
	}

	return rtf.format(0, "second");
}

export interface ActiveSessionProps {
	activeSession: Session;
}

export function ActiveSession({ activeSession }: ActiveSessionProps) {
	const { authClient, basePaths, localization, viewPaths, navigate } =
		useAuth();
	const { data: session } = useSession(authClient, { refetchOnMount: false });

	const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession(
		authClient,
		{
			onSuccess: () =>
				toast.success(localization.settings.revokeSessionSuccess),
		}
	);

	const isCurrentSession = activeSession.token === session?.session.token;
	const ua = Bowser.parse(activeSession.userAgent || "");
	const isMobile =
		ua.platform.type === "mobile" || ua.platform.type === "tablet";

	return (
		<Card className="border-0 bg-transparent shadow-none ring-0">
			<CardContent className="flex items-center justify-between gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
					{isMobile ? (
						<Smartphone className="size-4.5" />
					) : (
						<Monitor className="size-4.5" />
					)}
				</div>

				<div className="flex min-w-0 flex-col">
					<span className="truncate font-medium text-sm">
						{ua.browser.name || "Unknown Browser"}
						{ua.os.name ? `, ${ua.os.name}` : ""}
					</span>

					{isCurrentSession ? (
						<span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
							{localization.settings.currentSession}
						</span>
					) : (
						activeSession.createdAt && (
							<span className="text-muted-foreground text-xs capitalize">
								{timeAgo(activeSession.createdAt)}
							</span>
						)
					)}
				</div>

				<Button
					aria-label={
						isCurrentSession
							? localization.auth.signOut
							: localization.settings.revokeSession
					}
					className="ml-auto shrink-0"
					disabled={isRevoking}
					onClick={() =>
						isCurrentSession
							? navigate({
									to: `${basePaths.auth}/${viewPaths.auth.signOut}`,
								})
							: revokeSession(activeSession)
					}
					size="sm"
					variant="outline"
				>
					{isRevoking ? <Spinner /> : isCurrentSession ? <LogOut /> : <X />}

					{isCurrentSession
						? localization.auth.signOut
						: localization.settings.revoke}
				</Button>
			</CardContent>
		</Card>
	);
}
