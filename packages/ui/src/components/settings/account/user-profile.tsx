"use client";

import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent, CardFooter } from "@WAL-GO/ui/components/card";
import { Field, FieldError } from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@WAL-GO/ui/components/input-group";
import { Label } from "@WAL-GO/ui/components/label";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useIsUsernameAvailable,
	useSession,
	useUpdateUser,
} from "@better-auth-ui/react";
import { useDebouncer } from "@tanstack/react-pacer";
import { Check, X } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChangeAvatar } from "./change-avatar";

export interface UserProfileProps {
	className?: string;
}

/**
 * Render a profile card that lets the authenticated user view and update their display name, username, and avatar.
 *
 * @param className - Optional additional CSS class names applied to the card container
 * @returns A JSX element containing the profile card with avatar upload and editable name/username fields
 */
export function UserProfile({ className }: UserProfileProps) {
	const { localization, username: usernameConfig } = useAuth();
	const { data: session } = useSession();

	const currentUsername =
		(usernameConfig?.displayUsername
			? session?.user?.displayUsername
			: session?.user?.username) || "";

	const [username, setUsername] = useState(currentUsername);

	useEffect(() => {
		setUsername(currentUsername);
	}, [currentUsername]);

	const {
		mutate: isUsernameAvailable,
		data: usernameData,
		error: usernameError,
		reset: resetUsername,
	} = useIsUsernameAvailable();

	const usernameDebouncer = useDebouncer(
		(value: string) => {
			if (!value.trim() || value.trim() === currentUsername) {
				resetUsername();
				return;
			}

			isUsernameAvailable({ username: value.trim() });
		},
		{ wait: 500 }
	);

	function handleUsernameChange(value: string) {
		setUsername(value);
		resetUsername();

		if (usernameConfig?.isUsernameAvailable) {
			usernameDebouncer.maybeExecute(value);
		}
	}

	const { mutate: updateUser, isPending } = useUpdateUser({
		onSuccess: () => toast.success(localization.settings.profileUpdatedSuccess),
	});

	const [fieldErrors, setFieldErrors] = useState<{
		name?: string;
	}>({});

	function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;

		updateUser({
			name,
			...(usernameConfig?.enabled
				? {
						username: username.trim(),
						...(usernameConfig.displayUsername
							? { displayUsername: username.trim() }
							: {}),
					}
				: {}),
		});
	}

	const showAvailabilityIndicator =
		usernameConfig?.isUsernameAvailable &&
		username.trim() &&
		username.trim() !== currentUsername;

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.profile}
			</h2>

			<form onSubmit={handleSubmit}>
				<Card className={cn(className)}>
					<CardContent className="flex flex-col gap-6">
						<ChangeAvatar />

						{usernameConfig?.enabled && (
							<Field
								data-invalid={
									!!usernameError || (usernameData && !usernameData.available)
								}
							>
								<Label htmlFor="username">{localization.auth.username}</Label>

								{session ? (
									<InputGroup>
										<InputGroupInput
											aria-invalid={
												!!usernameError ||
												(usernameData && !usernameData.available)
											}
											autoComplete="username"
											disabled={isPending}
											id="username"
											maxLength={usernameConfig.maxUsernameLength}
											minLength={usernameConfig.minUsernameLength}
											name="username"
											onChange={(e) => handleUsernameChange(e.target.value)}
											placeholder={localization.auth.usernamePlaceholder}
											type="text"
											value={username}
										/>

										{showAvailabilityIndicator && (
											<InputGroupAddon align="inline-end">
												{usernameData?.available ? (
													<Check className="text-foreground" />
												) : usernameError ||
													usernameData?.available === false ? (
													<X className="text-destructive" />
												) : (
													<Spinner />
												)}
											</InputGroupAddon>
										)}
									</InputGroup>
								) : (
									<Skeleton>
										<Input className="invisible" />
									</Skeleton>
								)}

								<FieldError>
									{usernameError?.error?.message ||
										usernameError?.message ||
										(usernameData?.available === false &&
											localization.auth.usernameTaken)}
								</FieldError>
							</Field>
						)}

						<Field data-invalid={!!fieldErrors.name}>
							<Label htmlFor="name">{localization.auth.name}</Label>

							{session ? (
								<Input
									aria-invalid={!!fieldErrors.name}
									autoComplete="name"
									defaultValue={session?.user.name}
									disabled={isPending}
									id="name"
									key={session?.user.name}
									name="name"
									onChange={() => {
										setFieldErrors((prev) => ({
											...prev,
											name: undefined,
										}));
									}}
									onInvalid={(e) => {
										e.preventDefault();

										setFieldErrors((prev) => ({
											...prev,
											name: (e.target as HTMLInputElement).validationMessage,
										}));
									}}
									placeholder={localization.auth.name}
									required
								/>
							) : (
								<Skeleton>
									<Input className="invisible" />
								</Skeleton>
							)}

							<FieldError>{fieldErrors.name}</FieldError>
						</Field>
					</CardContent>

					<CardFooter>
						<Button disabled={isPending || !session} size="sm" type="submit">
							{isPending && <Spinner />}

							{localization.settings.saveChanges}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</div>
	);
}
