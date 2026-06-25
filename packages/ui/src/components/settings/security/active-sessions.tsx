"use client";

import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Separator } from "@WAL-GO/ui/components/separator";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useListSessions, useSession } from "@better-auth-ui/react";
import { ActiveSession } from "./active-session";

export interface ActiveSessionsProps {
	className?: string;
}

export function ActiveSessions({ className }: ActiveSessionsProps) {
	const { authClient, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { data: sessions, isPending } = useListSessions(authClient);

	const activeSessions = [...(sessions ?? [])].sort((activeSession) =>
		activeSession.id === session?.session.id ? -1 : 1
	);

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.activeSessions}
			</h2>

			<Card className={cn("p-0", className)}>
				<CardContent className="p-0">
					{isPending ? (
						<SessionRowSkeleton />
					) : (
						activeSessions?.map((activeSession, index) => (
							<div key={activeSession.id}>
								{index > 0 && <Separator />}

								<ActiveSession activeSession={activeSession} />
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function SessionRowSkeleton() {
	return (
		<Card className="border-0 bg-transparent shadow-none ring-0">
			<CardContent className="flex items-center gap-3">
				<Skeleton className="size-10 rounded-md" />

				<div className="flex flex-col gap-1">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-3 w-32" />
				</div>
			</CardContent>
		</Card>
	);
}
