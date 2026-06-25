"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@WAL-GO/ui/components/alert-dialog";
import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Field, FieldError } from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { deleteUserPlugin } from "@better-auth-ui/core/plugins";
import {
	useAuth,
	useAuthPlugin,
	useDeleteUser,
	useListAccounts,
} from "@better-auth-ui/react";
import { TriangleAlert } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";

export interface DeleteUserProps {
	className?: string;
}

export function DeleteUser({ className }: DeleteUserProps) {
	const { authClient, basePaths, localization, viewPaths, navigate } =
		useAuth();
	const deleteUserConfig = useAuthPlugin(deleteUserPlugin);

	const { data: accounts } = useListAccounts(authClient);

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [password, setPassword] = useState("");

	const hasCredentialAccount = accounts?.some(
		(account) => account.providerId === "credential"
	);
	const needsPassword =
		!deleteUserConfig?.sendDeleteAccountVerification && hasCredentialAccount;

	const { mutate: deleteUser, isPending } = useDeleteUser(authClient);

	const handleDialogOpenChange = (open: boolean) => {
		setConfirmOpen(open);
		setPassword("");
	};

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		const params = {
			...(needsPassword ? { password } : {}),
		};

		deleteUser(params, {
			onSuccess: () => {
				setConfirmOpen(false);
				setPassword("");

				if (deleteUserConfig?.sendDeleteAccountVerification) {
					toast.success(
						(localization.settings as Record<string, string>)
							.deleteUserVerificationSent
					);
				} else {
					toast.success(
						(localization.settings as Record<string, string>).deleteUserSuccess
					);
					navigate({
						to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
						replace: true,
					});
				}
			},
		});
	};

	return (
		<Card className={cn("border-destructive", className)}>
			<CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="font-medium text-sm leading-tight">
						{(localization.settings as Record<string, string>).deleteUser}
					</p>

					<p className="mt-0.5 text-muted-foreground text-xs">
						{
							(localization.settings as Record<string, string>)
								.deleteUserDescription
						}
					</p>
				</div>

				<AlertDialog onOpenChange={handleDialogOpenChange} open={confirmOpen}>
					<AlertDialogTrigger
						render={
							<Button disabled={!accounts} size="sm" variant="destructive" />
						}
					>
						{(localization.settings as Record<string, string>).deleteUser}
					</AlertDialogTrigger>

					<AlertDialogContent>
						<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
							<AlertDialogHeader>
								<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
									<TriangleAlert />
								</AlertDialogMedia>

								<AlertDialogTitle>
									{(localization.settings as Record<string, string>).deleteUser}
								</AlertDialogTitle>

								<AlertDialogDescription>
									{
										(localization.settings as Record<string, string>)
											.deleteUserDescription
									}
								</AlertDialogDescription>
							</AlertDialogHeader>

							{needsPassword && (
								<Field>
									<Label htmlFor="delete-password">
										{localization.auth.password}
									</Label>

									<Input
										autoComplete="current-password"
										disabled={isPending}
										id="delete-password"
										name="password"
										onChange={(e) => setPassword(e.target.value)}
										placeholder={localization.auth.passwordPlaceholder}
										required
										type="password"
										value={password}
									/>

									<FieldError />
								</Field>
							)}

							<AlertDialogFooter>
								<AlertDialogCancel>
									{localization.settings.cancel}
								</AlertDialogCancel>

								<AlertDialogAction variant="destructive">
									{isPending && <Spinner />}

									{(localization.settings as Record<string, string>).deleteUser}
								</AlertDialogAction>
							</AlertDialogFooter>
						</form>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
