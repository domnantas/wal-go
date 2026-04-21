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
import { cn } from "@WAL-GO/ui/lib/utils";
import {
	useAuth,
	useChangePassword,
	useListAccounts,
	useRequestPasswordReset,
	useSession,
} from "@better-auth-ui/react";
import { Eye, EyeOff } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";

export interface ChangePasswordProps {
	className?: string;
}

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
	const { emailAndPassword, localization } = useAuth();
	const { data: session } = useSession();
	const { data: accounts, isPending: isAccountsPending } = useListAccounts();

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
	const { localization } = useAuth();
	const { data: session } = useSession();

	const { mutate: requestPasswordReset, isPending } = useRequestPasswordReset({
		onSuccess: () => toast.success(localization.auth.passwordResetEmailSent),
	});

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
	session: ReturnType<typeof useSession>["data"];
}) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const { mutate: changePassword, isPending } = useChangePassword({
		onError: (error) => {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.error(error.error?.message || error.message);
		},
		onSuccess: () => {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success(localization.settings.changePasswordSuccess);
		},
	});

	const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
	const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
		useState(false);

	const [fieldErrors, setFieldErrors] = useState<{
		currentPassword?: string;
		newPassword?: string;
		confirmPassword?: string;
	}>({});

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (emailAndPassword.confirmPassword && newPassword !== confirmPassword) {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.error(localization.auth.passwordsDoNotMatch);
			return;
		}

		changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});
	};

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.changePassword}
			</h2>

			<form onSubmit={handleSubmit}>
				<Card className={cn(className)}>
					<CardContent className="flex flex-col gap-6">
						<Field data-invalid={!!fieldErrors.currentPassword}>
							<Label htmlFor="currentPassword">
								{localization.settings.currentPassword}
							</Label>

							{session ? (
								<Input
									aria-invalid={!!fieldErrors.currentPassword}
									autoComplete="current-password"
									disabled={isPending}
									id="currentPassword"
									name="currentPassword"
									onChange={(e) => {
										setCurrentPassword(e.target.value);

										setFieldErrors((prev) => ({
											...prev,
											currentPassword: undefined,
										}));
									}}
									onInvalid={(e) => {
										e.preventDefault();

										setFieldErrors((prev) => ({
											...prev,
											currentPassword: (e.target as HTMLInputElement)
												.validationMessage,
										}));
									}}
									placeholder={localization.settings.currentPasswordPlaceholder}
									required
									type="password"
									value={currentPassword}
								/>
							) : (
								<Skeleton>
									<Input className="invisible" />
								</Skeleton>
							)}

							<FieldError>{fieldErrors.currentPassword}</FieldError>
						</Field>

						<Field data-invalid={!!fieldErrors.newPassword}>
							<Label htmlFor="newPassword">
								{localization.auth.newPassword}
							</Label>

							{session ? (
								<InputGroup>
									<InputGroupInput
										aria-invalid={!!fieldErrors.newPassword}
										autoComplete="new-password"
										disabled={isPending}
										id="newPassword"
										maxLength={emailAndPassword.maxPasswordLength}
										minLength={emailAndPassword.minPasswordLength}
										name="newPassword"
										onChange={(e) => {
											setNewPassword(e.target.value);

											setFieldErrors((prev) => ({
												...prev,
												newPassword: undefined,
											}));
										}}
										onInvalid={(e) => {
											e.preventDefault();
											setFieldErrors((prev) => ({
												...prev,
												newPassword: (e.target as HTMLInputElement)
													.validationMessage,
											}));
										}}
										placeholder={localization.auth.newPasswordPlaceholder}
										required
										type={isNewPasswordVisible ? "text" : "password"}
										value={newPassword}
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

							<FieldError>{fieldErrors.newPassword}</FieldError>
						</Field>

						{emailAndPassword.confirmPassword && (
							<Field data-invalid={!!fieldErrors.confirmPassword}>
								<Label htmlFor="confirmPassword">
									{localization.auth.confirmPassword}
								</Label>

								{session ? (
									<InputGroup>
										<InputGroupInput
											aria-invalid={!!fieldErrors.confirmPassword}
											autoComplete="new-password"
											disabled={isPending}
											id="confirmPassword"
											maxLength={emailAndPassword.maxPasswordLength}
											minLength={emailAndPassword.minPasswordLength}
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
											placeholder={localization.auth.confirmPasswordPlaceholder}
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
												disabled={isPending}
												onClick={() =>
													setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
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

								<FieldError>{fieldErrors.confirmPassword}</FieldError>
							</Field>
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
