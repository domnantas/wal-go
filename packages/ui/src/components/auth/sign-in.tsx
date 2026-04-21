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
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";
import { MagicLinkButton } from "./magic-link-button";
import { PasskeyButton } from "./passkey-button";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export interface SignInProps {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
}

const basicEmailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string): boolean {
	return basicEmailValidationRegex.test(value);
}

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * @param className - Optional additional container class names
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The rendered sign-in UI as a JSX element
 */
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

	const [password, setPassword] = useState("");

	const { mutate: sendVerificationEmail } = useSendVerificationEmail({
		onSuccess: () => toast.success(localization.auth.verificationEmailSent),
	});

	const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
		{
			onError: (error, { email }) => {
				setPassword("");

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
				setPassword("");
				toast.error(error.error?.message || error.message);
			},
			onSuccess: () => navigate({ to: redirectTo }),
		});

	const isPending = signInEmailPending || signInUsernamePending;

	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const rememberMe = formData.get("rememberMe") === "on";

		if (usernameConfig?.enabled && !isEmail(email)) {
			signInUsername({
				username: email,
				password,
			});
		} else {
			signInEmail({
				email,
				password,
				...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
			});
		}
	};

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
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								<Field data-invalid={!!fieldErrors.email}>
									<Label htmlFor="email">
										{usernameConfig?.enabled
											? localization.auth.username
											: localization.auth.email}
									</Label>

									<Input
										aria-invalid={!!fieldErrors.email}
										autoComplete={
											usernameConfig?.enabled ? "username email" : "email"
										}
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
										placeholder={
											usernameConfig?.enabled
												? localization.auth.usernameOrEmailPlaceholder
												: localization.auth.emailPlaceholder
										}
										required
										type={usernameConfig?.enabled ? "text" : "email"}
									/>

									<FieldError>{fieldErrors.email}</FieldError>
								</Field>

								<Field data-invalid={!!fieldErrors.password}>
									<Label htmlFor="password">{localization.auth.password}</Label>

									<Input
										aria-invalid={!!fieldErrors.password}
										autoComplete="current-password"
										disabled={isPending}
										id="password"
										maxLength={emailAndPassword?.maxPasswordLength}
										minLength={emailAndPassword?.minPasswordLength}
										name="password"
										onChange={(e) => {
											setPassword(e.target.value);

											setFieldErrors((prev) => ({
												...prev,
												password: undefined,
											}));
										}}
										onInvalid={(e) => {
											e.preventDefault();

											setFieldErrors((prev) => ({
												...prev,
												password: (e.target as HTMLInputElement)
													.validationMessage,
											}));
										}}
										placeholder={localization.auth.passwordPlaceholder}
										required
										type="password"
										value={password}
									/>

									<FieldError>{fieldErrors.password}</FieldError>
								</Field>

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
