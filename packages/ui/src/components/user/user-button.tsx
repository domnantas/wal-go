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
import { themePlugin } from "@better-auth-ui/core/plugins";
import { useAuth, useAuthPlugin, useSession } from "@better-auth-ui/react";
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

export function UserButton({
	className,
	align,
	sideOffset,
	size = "default",
	themeToggle = true,
	variant = "ghost",
}: UserButtonProps) {
	const { authClient, basePaths, viewPaths, localization, plugins } = useAuth();
	const {
		theme,
		setTheme,
		themes,
		localization: themeLocalization,
	} = useAuthPlugin(themePlugin);

	const hasMultiSession =
		plugins?.some((p) => p.id === "multiSession") ?? false;

	const { data: session, isPending: sessionPending } = useSession(authClient);

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
								<a
									href={`${basePaths.settings}/${viewPaths.settings.account}`}
								/>
							}
						>
							<Settings className="text-muted-foreground" />
							{localization.settings.settings}
						</DropdownMenuItem>

						{hasMultiSession && (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>
									<UsersRound className="text-muted-foreground" />

									{(localization.auth as Record<string, string>).switchAccount}
								</DropdownMenuSubTrigger>

								<SwitchAccountMenu />
							</DropdownMenuSub>
						)}

						<DropdownMenuSeparator />
					</>
				) : (
					<>
						<DropdownMenuItem
							render={<a href={`${basePaths.auth}/${viewPaths.auth.signIn}`} />}
						>
							<LogIn className="text-muted-foreground" />
							{localization.auth.signIn}
						</DropdownMenuItem>

						<DropdownMenuItem
							render={<a href={`${basePaths.auth}/${viewPaths.auth.signUp}`} />}
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
							{themeLocalization.theme}
						</div>

						<Tabs className="ml-4" onValueChange={setTheme} value={theme}>
							<TabsList className="h-6! gap-0.5">
								{themes.includes("system") && (
									<TabsTrigger
										aria-label={themeLocalization.system}
										className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
										value="system"
									>
										<Monitor className="size-3" />
									</TabsTrigger>
								)}
								{themes.includes("light") && (
									<TabsTrigger
										aria-label={themeLocalization.light}
										className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
										value="light"
									>
										<Sun className="size-3" />
									</TabsTrigger>
								)}
								{themes.includes("dark") && (
									<TabsTrigger
										aria-label={themeLocalization.dark}
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
								<a href={`${basePaths.auth}/${viewPaths.auth.signOut}`} />
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
