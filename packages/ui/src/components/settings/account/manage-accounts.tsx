import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Separator } from "@WAL-GO/ui/components/separator";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useListDeviceSessions,
	useSession,
} from "@better-auth-ui/react";
import { ManageAccount } from "./manage-account";

export interface ManageAccountsProps {
	className?: string;
}

/**
 * Render a card that lists and manages all device sessions for the current user.
 *
 * Shows each session with user information and actions to switch to or revoke a session.
 * When device session data is loading, a pending placeholder row is displayed.
 *
 * @returns A JSX element containing the accounts management card
 */
export function ManageAccounts({ className }: ManageAccountsProps) {
	const { localization } = useAuth();
	const { data: session } = useSession();

	const { data: deviceSessions, isPending } = useListDeviceSessions();

	const otherSessions = deviceSessions?.filter(
		(deviceSession) => deviceSession.session.id !== session?.session.id
	);

	const allRows = [
		{
			key: "current",
			deviceSession: isPending ? null : session,
			isPending,
		},
		...(otherSessions?.map((deviceSession) => ({
			key: deviceSession.session.id,
			deviceSession,
			isPending: false,
		})) ?? []),
	];

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.manageAccounts}
			</h2>

			<Card className={cn("p-0", className)}>
				<CardContent className="p-0">
					{allRows.map((row, index) => (
						<div key={row.key}>
							{index > 0 && <Separator />}

							<ManageAccount
								deviceSession={row.deviceSession}
								isPending={row.isPending}
							/>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
