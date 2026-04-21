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
	const { localization, redirectTo, navigate } = useAuth();

	const { mutate: signInPasskey, isPending: passkeyPending } = useSignInPasskey(
		{
			onSuccess: () => navigate({ to: redirectTo }),
		}
	);

	const isDisabled = isPending || passkeyPending;

	return (
		<Button
			className={cn("w-full", isDisabled && "pointer-events-none opacity-50")}
			disabled={isDisabled}
			onClick={() => signInPasskey()}
			type="button"
			variant="outline"
		>
			{passkeyPending ? <Spinner /> : <Fingerprint />}
			{localization.auth.continueWith.replace(
				"{{provider}}",
				localization.auth.passkey
			)}
		</Button>
	);
}
