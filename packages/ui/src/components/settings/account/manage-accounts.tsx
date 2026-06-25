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

export function ManageAccounts({ className }: ManageAccountsProps) {
	const { authClient, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { data: deviceSessions, isPending } = useListDeviceSessions(authClient);

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
				{(localization.settings as Record<string, string>).manageAccounts}
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
