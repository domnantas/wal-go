"use client";

import { Button } from "@WAL-GO/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@WAL-GO/ui/components/card";
import { Checkbox } from "@WAL-GO/ui/components/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldSeparator,
} from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useSendVerificationEmail,
	useSignInEmail,
	useSignInUsername,
} from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { MagicLinkButton } from "./magic-link-button";
import { PasskeyButton } from "./passkey-button";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export interface SignInProps {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signInEmailSchema = z
	.email("Neteisingas el. pašto formatas")
	.trim()
	.min(1, "El. paštas yra privalomas");
const signInPasswordSchema = z.string().min(1, "Slaptažodis yra privalomas");

const signInSchema = z.object({
	email: signInEmailSchema,
	password: signInPasswordSchema,
});

export function SignIn({
	className,
	socialLayout,
	socialPosition = "bottom",
}: SignInProps) {
	const {
		basePaths,
		baseURL,
		emailAndPassword,
		localization,
		magicLink,
		passkey,
		redirectTo,
		socialProviders,
		username: usernameConfig,
		viewPaths,
		navigate,
		Link,
	} = useAuth();

	const { mutate: sendVerificationEmail } = useSendVerificationEmail({
		onSuccess: () => toast.success(localization.auth.verificationEmailSent),
	});

	const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
		{
			onError: (error, { email }) => {
				form.setFieldValue("password", "");

				if (error.error?.code === "EMAIL_NOT_VERIFIED") {
					toast.error(error.error?.message || error.message, {
						action: {
							label: localization.auth.resend,
							onClick: () =>
								sendVerificationEmail({
									email,
									callbackURL: `${baseURL}${redirectTo}`,
								}),
						},
					});
				} else {
					toast.error(error.error?.message || error.message);
				}
			},
			onSuccess: () => navigate({ to: redirectTo }),
		}
	);

	const { mutate: signInUsername, isPending: signInUsernamePending } =
		useSignInUsername({
			onError: (error) => {
				form.setFieldValue("password", "");
				toast.error(error.error?.message || error.message);
			},
			onSuccess: () => navigate({ to: redirectTo }),
		});

	const isPending = signInEmailPending || signInUsernamePending;

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: signInSchema,
		},
		onSubmit: ({ value }) => {
			const rememberMe =
				document.querySelector<HTMLInputElement>("#rememberMe")?.checked ??
				false;

			if (usernameConfig?.enabled && !EMAIL_REGEX.test(value.email)) {
				signInUsername({
					username: value.email,
					password: value.password,
				});
			} else {
				signInEmail({
					email: value.email,
					password: value.password,
					...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
				});
			}
		},
	});

	const showSeparator =
		emailAndPassword?.enabled && socialProviders && socialProviders.length > 0;

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.signIn}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="flex flex-col gap-6">
					{socialPosition === "top" && (
						<>
							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons
									isPending={isPending}
									socialLayout={socialLayout}
								/>
							)}

							{showSeparator && (
								<FieldSeparator className="m-0 flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}
						</>
					)}

					{emailAndPassword?.enabled && (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit();
							}}
						>
							<FieldGroup>
								<form.Field
									name="email"
									validators={{ onBlur: signInEmailSchema }}
								>
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<Label htmlFor="email">
													{usernameConfig?.enabled
														? localization.auth.username
														: localization.auth.email}
												</Label>

												<Input
													aria-invalid={isInvalid}
													autoComplete={
														usernameConfig?.enabled ? "username email" : "email"
													}
													disabled={isPending}
													id="email"
													name="email"
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={
														usernameConfig?.enabled
															? localization.auth.usernameOrEmailPlaceholder
															: localization.auth.emailPlaceholder
													}
													type="text"
													value={field.state.value}
												/>

												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>

								<form.Field
									name="password"
									validators={{ onBlur: signInPasswordSchema }}
								>
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<Label htmlFor="password">
													{localization.auth.password}
												</Label>

												<Input
													aria-invalid={isInvalid}
													autoComplete="current-password"
													disabled={isPending}
													id="password"
													name="password"
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={localization.auth.passwordPlaceholder}
													type="password"
													value={field.state.value}
												/>

												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</Field>
										);
									}}
								</form.Field>

								{emailAndPassword.rememberMe && (
									<Field className="my-1">
										<div className="flex items-center gap-3">
											<Checkbox
												disabled={isPending}
												id="rememberMe"
												name="rememberMe"
											/>

											<Label
												className="cursor-pointer font-normal text-sm"
												htmlFor="rememberMe"
											>
												{localization.auth.rememberMe}
											</Label>
										</div>
									</Field>
								)}

								<div className="flex flex-col gap-3">
									<Button disabled={isPending} type="submit">
										{isPending && <Spinner />}

										{localization.auth.signIn}
									</Button>

									{magicLink && (
										<MagicLinkButton isPending={isPending} view="signIn" />
									)}

									{passkey && <PasskeyButton isPending={isPending} />}
								</div>
							</FieldGroup>
						</form>
					)}

					{socialPosition === "bottom" && (
						<>
							{showSeparator && (
								<FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}

							{socialProviders && socialProviders.length > 0 && (
								<ProviderButtons
									isPending={isPending}
									socialLayout={socialLayout}
								/>
							)}
						</>
					)}
				</div>

				<div className="mt-4 flex w-full flex-col items-center gap-3">
					{emailAndPassword?.forgotPassword && (
						<Link
							className="self-center text-sm underline-offset-4 hover:underline"
							href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
						>
							{localization.auth.forgotPasswordLink}
						</Link>
					)}

					{emailAndPassword?.enabled && (
						<FieldDescription className="text-center">
							{localization.auth.needToCreateAnAccount}{" "}
							<Link
								className="underline underline-offset-4"
								href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
							>
								{localization.auth.signUp}
							</Link>
						</FieldDescription>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
