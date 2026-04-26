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
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@WAL-GO/ui/components/input-group";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useResetPassword } from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const resetPasswordFieldSchema = z
	.string()
	.min(1, "Slaptažodis yra privalomas");

const resetPasswordSchema = z.object({
	password: resetPasswordFieldSchema,
	confirmPassword: z.string(),
});

export interface ResetPasswordProps {
	className?: string;
}

export function ResetPassword({ className }: ResetPasswordProps) {
	const {
		basePaths,
		emailAndPassword,
		localization,
		viewPaths,
		navigate,
		Link,
	} = useAuth();

	const { mutate: resetPassword, isPending } = useResetPassword({
		onSuccess: () => {
			toast.success(localization.auth.passwordResetSuccess);
			navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` });
		},
	});

	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
		useState(false);

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const token = searchParams.get("token") as string;

		if (!token) {
			toast.error(localization.auth.invalidResetPasswordToken);
			navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` });
		}
	}, [
		basePaths.auth,
		localization.auth.invalidResetPasswordToken,
		viewPaths.auth.signIn,
		navigate,
	]);

	const passwordFieldSchema = emailAndPassword?.minPasswordLength
		? z
				.string()
				.min(1, "Slaptažodis yra privalomas")
				.min(
					emailAndPassword.minPasswordLength,
					`Slaptažodis turi būti bent ${emailAndPassword.minPasswordLength} simbolių`
				)
		: resetPasswordFieldSchema;

	const schema = emailAndPassword?.minPasswordLength
		? resetPasswordSchema.extend({ password: passwordFieldSchema })
		: resetPasswordSchema;

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: schema,
		},
		onSubmit: ({ value }) => {
			const searchParams = new URLSearchParams(window.location.search);
			const token = searchParams.get("token") as string;

			if (!token) {
				toast.error(localization.auth.invalidResetPasswordToken);
				navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` });
				return;
			}

			if (
				emailAndPassword?.confirmPassword &&
				value.password !== value.confirmPassword
			) {
				toast.error(localization.auth.passwordsDoNotMatch);
				return;
			}

			resetPassword({ token, newPassword: value.password });
		},
	});

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.resetPassword}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="password"
							validators={{ onBlur: passwordFieldSchema }}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<Label htmlFor="password">
											{localization.auth.password}
										</Label>

										<InputGroup>
											<InputGroupInput
												aria-invalid={isInvalid}
												autoComplete="new-password"
												disabled={isPending}
												id="password"
												name="password"
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder={localization.auth.newPasswordPlaceholder}
												type={isPasswordVisible ? "text" : "password"}
												value={field.state.value}
											/>

											<InputGroupAddon align="inline-end">
												<InputGroupButton
													aria-label={
														isPasswordVisible
															? localization.auth.hidePassword
															: localization.auth.showPassword
													}
													onClick={() =>
														setIsPasswordVisible(!isPasswordVisible)
													}
													title={
														isPasswordVisible
															? localization.auth.hidePassword
															: localization.auth.showPassword
													}
												>
													{isPasswordVisible ? <EyeOff /> : <Eye />}
												</InputGroupButton>
											</InputGroupAddon>
										</InputGroup>

										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{emailAndPassword?.confirmPassword && (
							<form.Field name="confirmPassword">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<Label htmlFor="confirmPassword">
												{localization.auth.confirmPassword}
											</Label>

											<InputGroup>
												<InputGroupInput
													aria-invalid={isInvalid}
													autoComplete="new-password"
													disabled={isPending}
													id="confirmPassword"
													name="confirmPassword"
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={
														localization.auth.confirmPasswordPlaceholder
													}
													type={isConfirmPasswordVisible ? "text" : "password"}
													value={field.state.value}
												/>

												<InputGroupAddon align="inline-end">
													<InputGroupButton
														aria-label={
															isConfirmPasswordVisible
																? localization.auth.hidePassword
																: localization.auth.showPassword
														}
														onClick={() =>
															setIsConfirmPasswordVisible(
																!isConfirmPasswordVisible
															)
														}
														title={
															isConfirmPasswordVisible
																? localization.auth.hidePassword
																: localization.auth.showPassword
														}
													>
														{isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>

											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						)}

						<div className="flex flex-col gap-3">
							<Button disabled={isPending} type="submit">
								{isPending && <Spinner />}

								{localization.auth.resetPassword}
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
