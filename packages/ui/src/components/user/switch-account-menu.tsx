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

/**
 * Render the submenu content for switching between multiple authenticated sessions.
 *
 * Shows the current session with a checkmark, lists other device sessions that can be activated,
 * and provides an option to add a new account. This component should be rendered inside a
 * DropdownMenuSub to defer the useListDeviceSessions query until the submenu is opened.
 *
 * @returns The switch account submenu content as a JSX element
 */
export function SwitchAccountMenu() {
	const { basePaths, viewPaths, localization, Link } = useAuth();
	const { data: session } = useSession();
	const { data: deviceSessions, isPending } = useListDeviceSessions();

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
				render={<Link href={`${basePaths.auth}/${viewPaths.auth.signIn}`} />}
			>
				<CirclePlus className="text-muted-foreground" />
				{localization.auth.addAccount}
			</DropdownMenuItem>
		</DropdownMenuSubContent>
	);
}
