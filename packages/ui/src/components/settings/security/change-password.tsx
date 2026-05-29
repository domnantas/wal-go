import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent, CardFooter } from "@WAL-GO/ui/components/card";
import { Field, FieldError } from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@WAL-GO/ui/components/input-group";
import { Label } from "@WAL-GO/ui/components/label";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useChangePassword,
	useListAccounts,
	useRequestPasswordReset,
	useSession,
} from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export interface ChangePasswordProps {
	className?: string;
}

const currentPasswordSchema = z
	.string()
	.min(1, "Dabartinis slaptažodis yra privalomas");
const passwordSchema = z.string().min(1, "Slaptažodis yra privalomas");
const changePasswordSchema = z.object({
	currentPassword: currentPasswordSchema,
	newPassword: passwordSchema,
	confirmPassword: passwordSchema,
});

/**
 * Render a card form for changing the authenticated user's password.
 *
 * When the user has a credential account, displays fields for current password,
 * new password, and optionally confirm password. When the user only has social
 * accounts, displays a prompt to set a password via the reset flow.
 *
 * @returns A JSX element containing the change-password or set-password card
 */
export function ChangePassword({ className }: ChangePasswordProps) {
	const { authClient, emailAndPassword, localization } = useAuth();
	const { data: session } = useSession(authClient);
	const { data: accounts, isPending: isAccountsPending } =
		useListAccounts(authClient);

	const hasCredentialAccount = accounts?.some(
		(account) => account.providerId === "credential"
	);

	if (!(isAccountsPending || hasCredentialAccount)) {
		return <SetPassword className={className} />;
	}

	return (
		<ChangePasswordForm
			className={className}
			emailAndPassword={emailAndPassword}
			localization={localization}
			session={isAccountsPending ? undefined : session}
		/>
	);
}

function SetPassword({ className }: { className?: string }) {
	const { authClient, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { mutate: requestPasswordReset, isPending } = useRequestPasswordReset(
		authClient,
		{
			onSuccess: () => toast.success(localization.auth.passwordResetEmailSent),
		}
	);

	const handleSetPassword = () => {
		if (!session) {
			return;
		}

		requestPasswordReset({ email: session.user.email });
	};

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.changePassword}
			</h2>

			<Card className={cn(className)}>
				<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-medium text-sm leading-tight">
							{localization.settings.setPassword}
						</p>

						<p className="mt-0.5 text-muted-foreground text-xs">
							{localization.settings.setPasswordDescription}
						</p>
					</div>

					<Button
						disabled={isPending || !session}
						onClick={handleSetPassword}
						size="sm"
					>
						{isPending && <Spinner />}

						{localization.auth.sendResetLink}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function ChangePasswordForm({
	className,
	emailAndPassword,
	localization,
	session,
}: {
	className?: string;
	emailAndPassword: ReturnType<typeof useAuth>["emailAndPassword"];
	localization: ReturnType<typeof useAuth>["localization"];
	session:
		| { user?: { email?: string | null }; session?: unknown }
		| null
		| undefined;
}) {
	const { authClient } = useAuth();
	const { mutate: changePassword, isPending } = useChangePassword(authClient, {
		onError: (error) => {
			form.reset();
			toast.error(error.error?.message || error.message);
		},
		onSuccess: () => {
			form.reset();
			toast.success(localization.settings.changePasswordSuccess);
		},
	});

	const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
	const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
		useState(false);

	const newPasswordMinSchema = emailAndPassword.minPasswordLength
		? passwordSchema.min(
				emailAndPassword.minPasswordLength,
				`Slaptažodį turi sudaryti bent ${emailAndPassword.minPasswordLength} simboliai`
			)
		: passwordSchema;
	const newPasswordFieldSchema = emailAndPassword.maxPasswordLength
		? newPasswordMinSchema.max(
				emailAndPassword.maxPasswordLength,
				`Slaptažodį turi sudaryti ne daugiau kaip ${emailAndPassword.maxPasswordLength} simboliai`
			)
		: newPasswordMinSchema;
	const schema =
		emailAndPassword.minPasswordLength || emailAndPassword.maxPasswordLength
			? changePasswordSchema.extend({
					newPassword: newPasswordFieldSchema,
					confirmPassword: newPasswordFieldSchema,
				})
			: changePasswordSchema;

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: schema,
		},
		onSubmit: ({ value }) => {
			if (
				emailAndPassword.confirmPassword &&
				value.newPassword !== value.confirmPassword
			) {
				form.reset();
				toast.error(localization.auth.passwordsDoNotMatch);
				return;
			}

			changePassword({
				currentPassword: value.currentPassword,
				newPassword: value.newPassword,
				revokeOtherSessions: true,
			});
		},
	});

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.changePassword}
			</h2>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<Card className={cn(className)}>
					<CardContent className="flex flex-col gap-6">
						<form.Field
							name="currentPassword"
							validators={{ onBlur: currentPasswordSchema }}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<Label htmlFor="currentPassword">
											{localization.settings.currentPassword}
										</Label>

										{session ? (
											<Input
												aria-invalid={isInvalid}
												autoComplete="current-password"
												disabled={isPending}
												id="currentPassword"
												name="currentPassword"
												onBlur={field.handleBlur}
												onChange={(e) =>
													handleFieldChange(field, e.target.value)
												}
												placeholder={
													localization.settings.currentPasswordPlaceholder
												}
												type="password"
												value={field.state.value}
											/>
										) : (
											<Skeleton>
												<Input className="invisible" />
											</Skeleton>
										)}

										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field
							name="newPassword"
							validators={{ onBlur: newPasswordFieldSchema }}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<Label htmlFor="newPassword">
											{localization.auth.newPassword}
										</Label>

										{session ? (
											<InputGroup>
												<InputGroupInput
													aria-invalid={isInvalid}
													autoComplete="new-password"
													disabled={isPending}
													id="newPassword"
													name="newPassword"
													onBlur={field.handleBlur}
													onChange={(e) =>
														handleFieldChange(field, e.target.value)
													}
													placeholder={localization.auth.newPasswordPlaceholder}
													type={isNewPasswordVisible ? "text" : "password"}
													value={field.state.value}
												/>

												<InputGroupAddon align="inline-end">
													<InputGroupButton
														aria-label={
															isNewPasswordVisible
																? localization.auth.hidePassword
																: localization.auth.showPassword
														}
														disabled={isPending}
														onClick={() =>
															setIsNewPasswordVisible(!isNewPasswordVisible)
														}
														size="icon-xs"
													>
														{isNewPasswordVisible ? <EyeOff /> : <Eye />}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
										) : (
											<Skeleton>
												<Input className="invisible" />
											</Skeleton>
										)}

										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{emailAndPassword.confirmPassword && (
							<form.Field
								name="confirmPassword"
								validators={{ onBlur: newPasswordFieldSchema }}
							>
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<Label htmlFor="confirmPassword">
												{localization.auth.confirmPassword}
											</Label>

											{session ? (
												<InputGroup>
													<InputGroupInput
														aria-invalid={isInvalid}
														autoComplete="new-password"
														disabled={isPending}
														id="confirmPassword"
														name="confirmPassword"
														onBlur={field.handleBlur}
														onChange={(e) =>
															handleFieldChange(field, e.target.value)
														}
														placeholder={
															localization.auth.confirmPasswordPlaceholder
														}
														type={
															isConfirmPasswordVisible ? "text" : "password"
														}
														value={field.state.value}
													/>

													<InputGroupAddon align="inline-end">
														<InputGroupButton
															aria-label={
																isConfirmPasswordVisible
																	? localization.auth.hidePassword
																	: localization.auth.showPassword
															}
															disabled={isPending}
															onClick={() =>
																setIsConfirmPasswordVisible(
																	!isConfirmPasswordVisible
																)
															}
															size="icon-xs"
														>
															{isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
														</InputGroupButton>
													</InputGroupAddon>
												</InputGroup>
											) : (
												<Skeleton>
													<Input className="invisible" />
												</Skeleton>
											)}

											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						)}
					</CardContent>

					<CardFooter>
						<Button disabled={isPending || !session} size="sm" type="submit">
							{isPending && <Spinner />}

							{localization.settings.updatePassword}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</div>
	);
}
