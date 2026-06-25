import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSubContent,
} from "@WAL-GO/ui/components/dropdown-menu";
import {
	useAuth,
	useListDeviceSessions,
	useSession,
} from "@better-auth-ui/react";
import { Check, CirclePlus } from "lucide-react";
import { SwitchAccountItem } from "./switch-account-item";
import { UserView } from "./user-view";

export function SwitchAccountMenu() {
	const { authClient, basePaths, viewPaths, localization } = useAuth();
	const { data: session } = useSession(authClient);
	const { data: deviceSessions, isPending } = useListDeviceSessions(authClient);

	return (
		<DropdownMenuSubContent className="min-w-48 max-w-[48svw] md:min-w-56">
			<DropdownMenuItem>
				<UserView isPending={isPending} />

				{!isPending && <Check className="ml-auto" />}
			</DropdownMenuItem>

			{deviceSessions
				?.filter(
					(deviceSession) => deviceSession.session.id !== session?.session.id
				)
				.map((deviceSession) => (
					<SwitchAccountItem
						deviceSession={deviceSession}
						key={deviceSession.session.id}
					/>
				))}

			<DropdownMenuSeparator />

			<DropdownMenuItem
				render={<a href={`${basePaths.auth}/${viewPaths.auth.signIn}`} />}
			>
				<CirclePlus className="text-muted-foreground" />
				{(localization.auth as Record<string, string>).addAccount}
			</DropdownMenuItem>
		</DropdownMenuSubContent>
	);
}
