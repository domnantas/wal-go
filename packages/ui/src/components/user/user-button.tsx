"use client";

import { Button } from "@WAL-GO/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@WAL-GO/ui/components/tabs";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSession } from "@better-auth-ui/react";
import {
	ChevronsUpDown,
	LogIn,
	LogOut,
	Monitor,
	Moon,
	Paintbrush,
	Settings,
	Sun,
	UserPlus2,
	UsersRound,
} from "lucide-react";
import { SwitchAccountMenu } from "./switch-account-menu";
import { UserAvatar } from "./user-avatar";
import { UserView } from "./user-view";

export interface UserButtonProps {
	align?: "center" | "end" | "start" | undefined;
	className?: string;
	sideOffset?: number;
	size?: "default" | "icon";
	themeToggle?: boolean;
	variant?:
		| "default"
		| "destructive"
		| "ghost"
		| "link"
		| "outline"
		| "secondary";
}

/**
 * Render a user dropdown button that shows user info, settings, theme controls, and authentication actions.
 *
 * Includes user profile, settings link, optional multi-session account switching, theme picker,
 * and sign-in/sign-up/sign-out actions depending on authentication state.
 *
 * @param className - Additional CSS classes applied to the button trigger
 * @param align - Alignment of the dropdown menu relative to the trigger
 * @param sideOffset - Offset between the trigger and the dropdown menu
 * @param size - "icon" renders only the avatar; "default" renders a full button with label and chevron
 * @param themeToggle - When true, renders a theme picker in the menu; defaults to true
 * @param variant - Visual variant of the trigger button
 * @returns The dropdown menu component with user actions
 */
export function UserButton({
	className,
	align,
	sideOffset,
	size = "default",
	themeToggle = true,
	variant = "ghost",
}: UserButtonProps) {
	const {
		basePaths,
		viewPaths,
		localization,
		multiSession,
		Link,
		appearance: { theme, setTheme, themes },
	} = useAuth();

	const { data: session, isPending: sessionPending } = useSession();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					size === "icon" && "rounded-full",
					size === "icon" && className
				)}
			>
				{size === "icon" ? (
					<UserAvatar />
				) : (
					<Button
						className={cn("h-auto py-2.5 font-normal", className)}
						size="lg"
						variant={variant}
					>
						{session || sessionPending ? (
							<UserView isPending={!!sessionPending} />
						) : (
							<>
								<UserAvatar />

								<div className="grid flex-1 text-left text-sm leading-tight">
									{localization.auth.account}
								</div>
							</>
						)}

						<ChevronsUpDown className="ml-auto" />
					</Button>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align={align}
				className="w-[--radix-dropdown-menu-trigger-width] min-w-40 max-w-[48svw] md:min-w-56"
				onCloseAutoFocus={(e) => e.preventDefault()}
				sideOffset={sideOffset}
			>
				{session && (
					<>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="font-normal text-sm">
								<UserView />
							</DropdownMenuLabel>
						</DropdownMenuGroup>

						<DropdownMenuSeparator />
					</>
				)}

				{session ? (
					<>
						<DropdownMenuItem
							render={
								<Link
									href={`${basePaths.settings}/${viewPaths.settings.account}`}
								/>
							}
						>
							<Settings className="text-muted-foreground" />
							{localization.settings.settings}
						</DropdownMenuItem>

						{multiSession && (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<UsersRound className="text-muted-foreground" />

									{localization.auth.switchAccount}
								</DropdownMenuSubTrigger>

								<SwitchAccountMenu />
							</DropdownMenuSub>
						)}

						<DropdownMenuSeparator />
					</>
				) : (
					<>
						<DropdownMenuItem
							render={
								<Link href={`${basePaths.auth}/${viewPaths.auth.signIn}`} />
							}
						>
							<LogIn className="text-muted-foreground" />
							{localization.auth.signIn}
						</DropdownMenuItem>

						<DropdownMenuItem
							render={
								<Link href={`${basePaths.auth}/${viewPaths.auth.signUp}`} />
							}
						>
							<UserPlus2 className="text-muted-foreground" />
							{localization.auth.signUp}
						</DropdownMenuItem>

						<DropdownMenuSeparator />
					</>
				)}

				{themeToggle && theme && setTheme && !!themes?.length && (
					<div className="flex items-center justify-between px-3 py-1.5 font-medium text-sm">
						<div className="flex items-center gap-2.5">
							<Paintbrush className="size-4 text-muted-foreground" />
							{localization.settings.theme}
						</div>

						<Tabs className="ml-4" onValueChange={setTheme} value={theme}>
							<TabsList className="h-6! gap-0.5">
								{themes.includes("system") && (
									<TabsTrigger
										aria-label={localization.settings.system}
										className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
										value="system"
									>
										<Monitor className="size-3" />
									</TabsTrigger>
								)}
								{themes.includes("light") && (
									<TabsTrigger
										aria-label={localization.settings.light}
										className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
										value="light"
									>
										<Sun className="size-3" />
									</TabsTrigger>
								)}
								{themes.includes("dark") && (
									<TabsTrigger
										aria-label={localization.settings.dark}
										className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
										value="dark"
									>
										<Moon className="size-3" />
									</TabsTrigger>
								)}
							</TabsList>
						</Tabs>
					</div>
				)}

				{session && (
					<>
						<DropdownMenuSeparator />

						<DropdownMenuItem
							render={
								<Link href={`${basePaths.auth}/${viewPaths.auth.signOut}`} />
							}
						>
							<LogOut className="text-muted-foreground" />
							{localization.auth.signOut}
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
