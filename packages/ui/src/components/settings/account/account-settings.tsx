import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth } from "@better-auth-ui/react";
import type { ComponentProps } from "react";
import { Appearance } from "./appearance";
import { ChangeEmail } from "./change-email";
import { ManageAccounts } from "./manage-accounts";
import { UserProfile } from "./user-profile";

export interface AccountSettingsProps {
	className?: string;
}

export function AccountSettings({
	className,
	...props
}: AccountSettingsProps & ComponentProps<"div">) {
	const { emailAndPassword, plugins } = useAuth();

	const hasTheme = plugins?.some((p) => p.id === "theme") ?? false;
	const hasMultiSession =
		plugins?.some((p) => p.id === "multiSession") ?? false;
	const hasMagicLink = plugins?.some((p) => p.id === "magicLink") ?? false;
	const hasUsername = plugins?.some((p) => p.id === "username") ?? false;

	return (
		<div
			className={cn("flex w-full flex-col gap-4 md:gap-6", className)}
			{...props}
		>
			{hasUsername && <UserProfile />}
			{(emailAndPassword?.enabled || hasMagicLink) && <ChangeEmail />}
			{hasTheme && <Appearance />}
			{hasMultiSession && <ManageAccounts />}
		</div>
	);
}
