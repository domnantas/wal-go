import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth } from "@better-auth-ui/react";
import { ActiveSessions } from "./active-sessions";
import { ChangePassword } from "./change-password";
import { DangerZone } from "./danger-zone";
import { LinkedAccounts } from "./linked-accounts";
import { Passkeys } from "./passkeys";

export interface SecuritySettingsProps {
	className?: string;
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
	const { emailAndPassword, plugins, socialProviders } = useAuth();

	const hasPasskey = plugins?.some((p) => p.id === "passkey") ?? false;
	const hasDeleteUser = plugins?.some((p) => p.id === "deleteUser") ?? false;

	return (
		<div className={cn("flex w-full flex-col gap-4 md:gap-6", className)}>
			{emailAndPassword?.enabled && <ChangePassword />}
			{!!socialProviders?.length && <LinkedAccounts />}
			{hasPasskey && <Passkeys />}
			<ActiveSessions />
			{hasDeleteUser && <DangerZone />}
		</div>
	);
}
