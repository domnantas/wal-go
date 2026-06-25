import { Button } from "@WAL-GO/ui/components/button";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { getProviderName } from "@better-auth-ui/core";
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react";
import type { SocialProvider } from "better-auth/social-providers";
import { type ComponentProps, useState } from "react";

export type ProviderButtonProps = {
	provider: SocialProvider;
	label?: "continueWith" | "providerName" | "none";
	isDisabled?: boolean;
} & Omit<ComponentProps<typeof Button>, "onClick" | "disabled" | "children">;

export function ProviderButton({
	provider,
	label = "continueWith",
	isDisabled,
	variant = "outline",
	...props
}: ProviderButtonProps) {
	const { authClient, baseURL, localization, redirectTo } = useAuth();

	const callbackURL = `${baseURL}${redirectTo}`;

	const [redirecting, setRedirecting] = useState(false);

	const { mutate: signInSocial, isPending } = useSignInSocial(authClient, {
		onSuccess: () => {
			setRedirecting(true);

			setTimeout(() => {
				setRedirecting(false);
			}, 5000);
		},
	});

	const ProviderIcon = providerIcons[provider];

	const pending = isPending || redirecting;

	return (
		<Button
			disabled={isDisabled || pending}
			onClick={() => signInSocial({ provider, callbackURL })}
			type="button"
			variant={variant}
			{...props}
		>
			{pending || !ProviderIcon ? <Spinner /> : <ProviderIcon />}

			{label === "continueWith"
				? localization.auth.continueWith.replace(
						"{{provider}}",
						getProviderName(provider)
					)
				: label === "providerName"
					? getProviderName(provider)
					: null}
		</Button>
	);
}
