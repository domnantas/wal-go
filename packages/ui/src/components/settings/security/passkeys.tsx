"use client";

import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Separator } from "@WAL-GO/ui/components/separator";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAddPasskey,
	useAuth,
	useListUserPasskeys,
} from "@better-auth-ui/react";
import { Passkey } from "./passkey";

export interface PasskeysProps {
	className?: string;
}

export function Passkeys({ className }: PasskeysProps) {
	const { localization } = useAuth();

	const { data: passkeys, isPending } = useListUserPasskeys();

	const { mutate: addPasskey, isPending: isAdding } = useAddPasskey();

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.passkeys}
			</h2>

			<Card className={cn("p-0", className)}>
				<CardContent className="p-0">
					<Card className="border-0 bg-transparent shadow-none ring-0">
						<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="font-medium text-sm leading-tight">
									{localization.settings.passkeysDescription}
								</p>

								<p className="mt-0.5 text-muted-foreground text-xs">
									{localization.settings.passkeysInstructions}
								</p>
							</div>

							<Button
								className="shrink-0"
								disabled={isPending || isAdding}
								onClick={() => addPasskey()}
								size="sm"
							>
								{isAdding && <Spinner />}
								{localization.settings.addPasskey}
							</Button>
						</CardContent>
					</Card>

					{isPending ? (
						<>
							<Separator />
							<PasskeySkeleton />
						</>
					) : (
						passkeys?.map((passkey) => (
							<div key={passkey.id}>
								<Separator />
								<Passkey passkey={passkey} />
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function PasskeySkeleton() {
	return (
		<Card className="border-0 bg-transparent shadow-none ring-0">
			<CardContent className="flex items-center gap-3">
				<Skeleton className="size-10 rounded-md" />

				<div className="flex flex-col gap-1">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-20" />
				</div>
			</CardContent>
		</Card>
	);
}
