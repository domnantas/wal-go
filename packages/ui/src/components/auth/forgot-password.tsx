"use client";

import { Button } from "@WAL-GO/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@WAL-GO/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
} from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useRequestPasswordReset } from "@better-auth-ui/react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";

export interface ForgotPasswordProps {
	className?: string;
}

/**
 * Render a card-based "Forgot Password" form that sends a password-reset email.
 *
 * The form displays an email input, submit button, and a link back to sign-in.
 * Toasts are displayed on success or error via the `useForgotPassword` hook.
 *
 * @param className - Optional additional CSS class names applied to the card
 * @returns The forgot-password form UI as a JSX element
 */
export function ForgotPassword({ className }: ForgotPasswordProps) {
	const { basePaths, localization, viewPaths, Link } = useAuth();

	const { mutate: requestPasswordReset, isPending } = useRequestPasswordReset({
		onSuccess: () => toast.success(localization.auth.passwordResetEmailSent),
	});

	function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		requestPasswordReset({ email: formData.get("email") as string });
	}

	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
	}>({});

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.forgotPassword}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field data-invalid={!!fieldErrors.email}>
							<Label htmlFor="email">{localization.auth.email}</Label>

							<Input
								aria-invalid={!!fieldErrors.email}
								autoComplete="email"
								disabled={isPending}
								id="email"
								name="email"
								onChange={() => {
									setFieldErrors((prev) => ({
										...prev,
										email: undefined,
									}));
								}}
								onInvalid={(e) => {
									e.preventDefault();

									setFieldErrors((prev) => ({
										...prev,
										email: (e.target as HTMLInputElement).validationMessage,
									}));
								}}
								placeholder={localization.auth.emailPlaceholder}
								required
								type="email"
							/>

							<FieldError>{fieldErrors.email}</FieldError>
						</Field>

						<div className="flex flex-col gap-3">
							<Button disabled={isPending} type="submit">
								{isPending && <Spinner />}

								{localization.auth.sendResetLink}
							</Button>
						</div>
					</FieldGroup>
				</form>

				<div className="mt-4 flex w-full flex-col items-center gap-3">
					<FieldDescription className="text-center">
						{localization.auth.rememberYourPassword}{" "}
						<Link
							className="underline underline-offset-4"
							href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
						>
							{localization.auth.signIn}
						</Link>
					</FieldDescription>
				</div>
			</CardContent>
		</Card>
	);
}
