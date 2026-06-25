"use client";

import { DropdownMenuItem } from "@WAL-GO/ui/components/dropdown-menu";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import {
	type ListDeviceSession,
	useAuth,
	useSetActiveSession,
} from "@better-auth-ui/react";
import { UserView } from "./user-view";

export type DeviceSession = ListDeviceSession;

export interface SwitchAccountItemProps {
	deviceSession: DeviceSession;
}

export function SwitchAccountItem({ deviceSession }: SwitchAccountItemProps) {
	const { authClient } = useAuth();
	const { mutate: setActiveSession, isPending } =
		useSetActiveSession(authClient);

	return (
		<DropdownMenuItem
			disabled={isPending}
			onSelect={() =>
				setActiveSession({ sessionToken: deviceSession.session.token })
			}
		>
			<UserView user={deviceSession.user} />

			{isPending && <Spinner className="ml-auto size-4" />}
		</DropdownMenuItem>
	);
}
