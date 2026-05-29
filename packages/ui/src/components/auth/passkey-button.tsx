"use client";

import { Button } from "@WAL-GO/ui/components/button";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSignInPasskey } from "@better-auth-ui/react";
import { Fingerprint } from "lucide-react";

export interface PasskeyButtonProps {
	isPending: boolean;
}

export function PasskeyButton({ isPending }: PasskeyButtonProps) {
	const { authClient, localization, redirectTo, navigate } = useAuth();

	// biome-ignore lint/suspicious/noExplicitAny: passkey plugin not in base authClient type
	const { mutate: signInPasskey, isPending: passkeyPending } = useSignInPasskey(
		authClient as any,
		{
			onSuccess: () => navigate({ to: redirectTo }),
		}
	);

	const isDisabled = isPending || passkeyPending;

	return (
		<Button
			className={cn("w-full", isDisabled && "pointer-events-none opacity-50")}
			disabled={isDisabled}
			onClick={() => signInPasskey({})}
			type="button"
			variant="outline"
		>
			{passkeyPending ? <Spinner /> : <Fingerprint />}
			{(
				(localization.auth as Record<string, string>).continueWith ?? ""
			).replace(
				"{{provider}}",
				(localization.auth as Record<string, string>).passkey ?? ""
			)}
		</Button>
	);
}
