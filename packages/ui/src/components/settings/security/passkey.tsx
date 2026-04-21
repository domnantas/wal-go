import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { useAuth, useDeletePasskey } from "@better-auth-ui/react";
import { Fingerprint, X } from "lucide-react";

export interface PasskeyProps {
	passkey: {
		id: string;
		name?: string | null;
		createdAt: Date;
	};
}

export function Passkey({ passkey }: PasskeyProps) {
	const { localization } = useAuth();

	const { mutate: deletePasskey, isPending } = useDeletePasskey();

	return (
		<Card className="border-0 bg-transparent shadow-none ring-0">
			<CardContent className="flex items-center justify-between gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
					<Fingerprint className="size-4.5" />
				</div>

				<div className="flex min-w-0 flex-col">
					<span className="font-medium text-sm leading-tight">
						{passkey.name || localization.auth.passkey}
					</span>

					<span className="text-muted-foreground text-xs">
						{new Date(passkey.createdAt).toLocaleString(undefined, {
							dateStyle: "medium",
							timeStyle: "short",
						})}
					</span>
				</div>

				<Button
					className="ml-auto shrink-0"
					disabled={isPending}
					onClick={() => deletePasskey({ id: passkey.id })}
					size="sm"
					variant="outline"
				>
					{isPending ? <Spinner /> : <X />}
					{localization.settings.delete}
				</Button>
			</CardContent>
		</Card>
	);
}
