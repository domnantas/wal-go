"use client";

import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { UserView } from "@WAL-GO/ui/components/user/user-view";
import {
	useAuth,
	useRevokeMultiSession,
	useSession,
	useSetActiveSession,
} from "@better-auth-ui/react";
import type { Session, User } from "better-auth";
import { ArrowLeftRight, LogOut, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export interface DeviceSession {
	session: Session;
	user: User;
}

export interface ManageAccountProps {
	deviceSession?: DeviceSession | null;
	isPending?: boolean;
}

/**
 * Render a single account row with user info and switch/revoke controls.
 *
 * Shows the user's avatar and info. For the active session, shows a sign-out button.
 * For non-active sessions, shows a dropdown menu with switch and sign-out options.
 *
 * @param deviceSession - The device session object containing session and user data
 * @param isPending - Whether the device session is pending
 * @returns A JSX element containing the account row
 */
export function ManageAccount({
	deviceSession,
	isPending,
}: ManageAccountProps) {
	const { authClient, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { mutate: setActiveSession, isPending: isSwitching } =
		useSetActiveSession(authClient);

	const { mutate: revokeSession, isPending: isRevoking } =
		useRevokeMultiSession(authClient, {
			onSuccess: () =>
				toast.success(localization.settings.revokeSessionSuccess),
		});

	const isActive = deviceSession?.session.userId === session?.session.userId;
	const isBusy = isSwitching || isRevoking;

	return (
		<Card className="border-0 bg-transparent shadow-none ring-0">
			<CardContent className="flex items-center justify-between gap-3">
				<UserView isPending={isPending} user={deviceSession?.user} />

				{deviceSession && isActive && (
					<Button
						className="shrink-0"
						disabled={isBusy}
						onClick={() =>
							revokeSession({ sessionToken: deviceSession.session.token })
						}
						size="sm"
						variant="outline"
					>
						{isRevoking ? <Spinner /> : <LogOut />}
						{localization.auth.signOut}
					</Button>
				)}

				{deviceSession && !isActive && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									className="shrink-0"
									disabled={isBusy}
									size="icon-sm"
									variant="ghost"
								/>
							}
						>
							<MoreHorizontal />
						</DropdownMenuTrigger>

						<DropdownMenuContent align="end" className="min-w-fit">
							<DropdownMenuItem
								onClick={() =>
									setActiveSession({
										sessionToken: deviceSession.session.token,
									})
								}
							>
								<ArrowLeftRight className="text-muted-foreground" />
								{(localization.auth as Record<string, string>).switchAccount}
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() =>
									revokeSession({
										sessionToken: deviceSession.session.token,
									})
								}
							>
								<LogOut className="text-muted-foreground" />
								{localization.auth.signOut}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</CardContent>
		</Card>
	);
}
