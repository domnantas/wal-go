"use client";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@WAL-GO/ui/components/tabs";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useAuthenticate } from "@better-auth-ui/react";
import { useMemo } from "react";
import { AccountSettings } from "./account/account-settings";
import { SecuritySettings } from "./security/security-settings";

type SettingsView = "account" | "security";

export interface SettingsProps {
	className?: string;
	hideNav?: boolean;
	path?: string;
	view?: SettingsView;
}

export function Settings({ className, view, path, hideNav }: SettingsProps) {
	const { authClient, basePaths, localization, viewPaths } = useAuth();
	useAuthenticate(authClient);

	if (!(view || path)) {
		throw new Error(
			"[Better Auth UI] Either `view` or `path` must be provided"
		);
	}

	const settingsPathViews = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(viewPaths.settings).map(([k, v]) => [v, k])
			) as Record<string, SettingsView>,
		[viewPaths.settings]
	);

	const currentView = view || (path ? settingsPathViews[path] : undefined);

	return (
		<Tabs
			className={cn("w-full gap-4 md:gap-6", className)}
			value={currentView}
		>
			<div className={cn(hideNav && "hidden")}>
				<TabsList aria-label={localization.settings.settings}>
					<TabsTrigger
						render={
							<a href={`${basePaths.settings}/${viewPaths.settings.account}`} />
						}
						value="account"
					>
						{localization.settings.account}
					</TabsTrigger>

					<TabsTrigger
						render={
							<a
								href={`${basePaths.settings}/${viewPaths.settings.security}`}
							/>
						}
						value="security"
					>
						{localization.settings.security}
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent tabIndex={-1} value="account">
				<AccountSettings />
			</TabsContent>

			<TabsContent tabIndex={-1} value="security">
				<SecuritySettings />
			</TabsContent>
		</Tabs>
	);
}
