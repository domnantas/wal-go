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
	FieldSeparator,
} from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@WAL-GO/ui/components/input-group";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useIsUsernameAvailable,
	useSignUpEmail,
} from "@better-auth-ui/react";
import { useDebouncer } from "@tanstack/react-pacer";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";
import { MagicLinkButton } from "./magic-link-button";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export interface SignUpProps {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
}

/**
 * Renders a sign-up form with name, email, and password fields, optional social provider buttons, and submission handling.
 *
 * Submits credentials to the configured auth client and handles the response:
 * - If email verification is required, shows a notification and navigates to sign-in
 * - On success, refreshes the session and navigates to the configured redirect path
 * - On failure, displays error toasts
 * - Manages a pending state while the request is in-flight
 *
 * @param className - Additional CSS classes applied to the outer container
 * @param socialLayout - Social layout to apply to the component
 * @param socialPosition - Social position to apply to the component
 * @returns The sign-up form React element.
 */
export function SignUp({
	className,
	socialLayout,
	socialPosition = "bottom",
}: SignUpProps) {
	const {
		basePaths,
		emailAndPassword,
		localization,
		magicLink,
		redirectTo,
		socialProviders,
		username: usernameConfig,
		viewPaths,
		navigate,
		Link,
	} = useAuth();

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [username, setUsername] = useState("");

	const {
		mutate: isUsernameAvailable,
		data: usernameData,
		error: usernameError,
		reset: resetUsername,
	} = useIsUsernameAvailable();

	const usernameDebouncer = useDebouncer(
		(value: string) => {
			if (!value.trim()) {
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

	const { mutate: signUpEmail, isPending: signUpPending } = useSignUpEmail({
		onError: (error) => {
			setPassword("");
			setConfirmPassword("");
			toast.error(error.error?.message || error.message);
		},
		onSuccess: () => {
			if (emailAndPassword?.requireEmailVerification) {
				toast.success(localization.auth.verifyYourEmail);
				navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` });
			} else {
				navigate({ to: redirectTo });
			}
		},
	});

	const isPending = signUpPending;

	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
		useState(false);

	const [fieldErrors, setFieldErrors] = useState<{
		name?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
	}>({});

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const email = formData.get("email") as string;

		if (emailAndPassword?.confirmPassword && password !== confirmPassword) {
			toast.error(localization.auth.passwordsDoNotMatch);
			setPassword("");
			setConfirmPassword("");
			return;
		}

		signUpEmail({
			name,
			email,
			password,
			...(usernameConfig?.enabled
				? {
						username: username.trim(),
						...(usernameConfig.displayUsername
							? { displayUsername: username.trim() }
							: {}),
					}
				: {}),
		});
	};

	const showSeparator =
		emailAndPassword?.enabled && socialProviders && socialProviders.length > 0;

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.signUp}
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
								<FieldSeparator className="flex items-center text-xs *:data-[slot=field-separator-content]:bg-card">
									{localization.auth.or}
								</FieldSeparator>
							)}
						</>
					)}

					{emailAndPassword?.enabled && (
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								<Field data-invalid={!!fieldErrors.name}>
									<Label htmlFor="name">{localization.auth.name}</Label>

									<Input
										aria-invalid={!!fieldErrors.name}
										autoComplete="name"
										disabled={isPending}
										id="name"
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
										placeholder={localization.auth.namePlaceholder}
										required
										type="text"
									/>

									<FieldError>{fieldErrors.name}</FieldError>
								</Field>

								{usernameConfig?.enabled && (
									<Field
										data-invalid={
											!!usernameError ||
											(usernameData && !usernameData.available)
										}
									>
										<Label htmlFor="username">
											{localization.auth.username}
										</Label>

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
												required
												type="text"
												value={username}
											/>

											{usernameConfig.isUsernameAvailable &&
												username.trim() && (
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

										<FieldError>
											{usernameError?.error?.message ||
												usernameError?.message ||
												(usernameData?.available === false
													? localization.auth.usernameTaken
													: null)}
										</FieldError>
									</Field>
								)}

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

								<Field data-invalid={!!fieldErrors.password}>
									<Label htmlFor="password">{localization.auth.password}</Label>

									<InputGroup>
										<InputGroupInput
											aria-invalid={!!fieldErrors.password}
											autoComplete="new-password"
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
											type={isPasswordVisible ? "text" : "password"}
											value={password}
										/>

										<InputGroupAddon align="inline-end">
											<InputGroupButton
												aria-label={
													isPasswordVisible
														? localization.auth.hidePassword
														: localization.auth.showPassword
												}
												onClick={() => {
													setIsPasswordVisible(!isPasswordVisible);
												}}
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

									<FieldError>{fieldErrors.password}</FieldError>
								</Field>

								{emailAndPassword?.confirmPassword && (
									<Field data-invalid={!!fieldErrors.confirmPassword}>
										<Label htmlFor="confirmPassword">
											{localization.auth.confirmPassword}
										</Label>

										<InputGroup>
											<InputGroupInput
												aria-invalid={!!fieldErrors.confirmPassword}
												autoComplete="new-password"
												disabled={isPending}
												id="confirmPassword"
												maxLength={emailAndPassword?.maxPasswordLength}
												minLength={emailAndPassword?.minPasswordLength}
												name="confirmPassword"
												onChange={(e) => {
													setConfirmPassword(e.target.value);

													setFieldErrors((prev) => ({
														...prev,
														confirmPassword: undefined,
													}));
												}}
												onInvalid={(e) => {
													e.preventDefault();

													setFieldErrors((prev) => ({
														...prev,
														confirmPassword: (e.target as HTMLInputElement)
															.validationMessage,
													}));
												}}
												placeholder={
													localization.auth.confirmPasswordPlaceholder
												}
												required
												type={isConfirmPasswordVisible ? "text" : "password"}
												value={confirmPassword}
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

										<FieldError>{fieldErrors.confirmPassword}</FieldError>
									</Field>
								)}

								<div className="flex flex-col gap-3">
									<Button disabled={isPending} type="submit">
										{isPending && <Spinner />}

										{localization.auth.signUp}
									</Button>

									{magicLink && (
										<MagicLinkButton isPending={isPending} view="signUp" />
									)}
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

				{emailAndPassword?.enabled && (
					<div className="mt-4 flex w-full flex-col items-center gap-3">
						<FieldDescription className="text-center">
							{localization.auth.alreadyHaveAnAccount}{" "}
							<Link
								className="underline underline-offset-4"
								href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
							>
								{localization.auth.signIn}
							</Link>
						</FieldDescription>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
