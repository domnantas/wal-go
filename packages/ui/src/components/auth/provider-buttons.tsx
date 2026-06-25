"use client";

import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth } from "@better-auth-ui/react";
import { useMemo } from "react";
import { ProviderButton } from "./provider-button";

export interface ProviderButtonsProps {
	isPending?: boolean;
	socialLayout?: SocialLayout;
}

export type SocialLayout = "auto" | "horizontal" | "vertical" | "grid";

export function ProviderButtons({
	isPending,
	socialLayout = "auto",
}: ProviderButtonsProps) {
	const { socialProviders } = useAuth();

	const resolvedSocialLayout = useMemo(() => {
		if (socialLayout === "auto") {
			if (socialProviders?.length && socialProviders.length >= 4) {
				return "horizontal";
			}

			return "vertical";
		}

		return socialLayout;
	}, [socialLayout, socialProviders?.length]);

	return (
		<div
			className={cn(
				"gap-3",
				resolvedSocialLayout === "grid" && "grid grid-cols-2",
				resolvedSocialLayout === "vertical" && "flex flex-col",
				resolvedSocialLayout === "horizontal" && "flex flex-row flex-wrap"
			)}
		>
			{socialProviders?.map((provider) => (
				<ProviderButton
					className={cn(resolvedSocialLayout === "horizontal" && "flex-1")}
					isDisabled={isPending}
					key={provider}
					label={
						resolvedSocialLayout === "vertical"
							? "continueWith"
							: resolvedSocialLayout === "grid"
								? "providerName"
								: "none"
					}
					provider={provider}
				/>
			))}
		</div>
	);
}
