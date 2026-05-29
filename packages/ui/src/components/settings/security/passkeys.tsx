"use client";

import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Separator } from "@WAL-GO/ui/components/separator";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAddPasskey, useAuth, useListPasskeys } from "@better-auth-ui/react";
import { Passkey } from "./passkey";

export interface PasskeysProps {
	className?: string;
}

export function Passkeys({ className }: PasskeysProps) {
	const { authClient, localization } = useAuth();

	// biome-ignore lint/suspicious/noExplicitAny: passkey plugin not in base authClient type
	const { data: passkeys, isPending } = useListPasskeys(authClient as any) as {
		data:
			| { id: string; name?: string | null; createdAt: Date }[]
			| null
			| undefined;
		isPending: boolean;
	};

	// biome-ignore lint/suspicious/noExplicitAny: passkey plugin not in base authClient type
	const { mutate: addPasskey, isPending: isAdding } = useAddPasskey(
		authClient as any
	);

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{(localization.settings as Record<string, string>).passkeys}
			</h2>

			<Card className={cn("p-0", className)}>
				<CardContent className="p-0">
					<Card className="border-0 bg-transparent shadow-none ring-0">
						<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="font-medium text-sm leading-tight">
									{
										(localization.settings as Record<string, string>)
											.passkeysDescription
									}
								</p>

								<p className="mt-0.5 text-muted-foreground text-xs">
									{
										(localization.settings as Record<string, string>)
											.passkeysInstructions
									}
								</p>
							</div>

							<Button
								className="shrink-0"
								disabled={isPending || isAdding}
								onClick={() => addPasskey({})}
								size="sm"
							>
								{isAdding && <Spinner />}
								{(localization.settings as Record<string, string>).addPasskey}
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
