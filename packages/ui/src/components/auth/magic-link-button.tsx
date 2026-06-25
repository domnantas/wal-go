import { Button } from "@WAL-GO/ui/components/button";
import { cn } from "@WAL-GO/ui/lib/utils";
import type { AuthView } from "@better-auth-ui/core";
import { useAuth } from "@better-auth-ui/react";
import { Lock, Mail } from "lucide-react";

export interface MagicLinkButtonProps {
	isPending: boolean;
	view?: AuthView;
}

export function MagicLinkButton({ isPending, view }: MagicLinkButtonProps) {
	const { basePaths, viewPaths, localization } = useAuth();

	const isMagicLinkView = view === "magicLink";

	return (
		<Button
			className={cn("w-full", isPending && "pointer-events-none opacity-50")}
			disabled={isPending}
			nativeButton={false}
			render={
				<a
					href={`${basePaths.auth}/${isMagicLinkView ? viewPaths.auth.signIn : viewPaths.auth.magicLink}`}
				/>
			}
			type="button"
			variant="outline"
		>
			{isMagicLinkView ? <Lock /> : <Mail />}
			{(
				(localization.auth as Record<string, string>).continueWith ?? ""
			).replace(
				"{{provider}}",
				isMagicLinkView
					? ((localization.auth as Record<string, string>).password ?? "")
					: ((localization.auth as Record<string, string>).magicLink ?? "")
			)}
		</Button>
	);
}
