import { BLOCKED_CALLSIGN_REGEX, CALLSIGN_REGEX } from "@WAL-GO/callsign";
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
import { handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import { usernamePlugin } from "@better-auth-ui/core/plugins";
import { useAuth, useAuthPlugin, useSignUpEmail } from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { MagicLinkButton } from "./magic-link-button";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

const nameSchema = z
	.string()
	.min(1, "Šaukinys yra privalomas")
	.refine(
		(v) => !BLOCKED_CALLSIGN_REGEX.test(v.trim().toUpperCase()),
		"Rusijos ir Baltarusijos šaukiniai neleistini. Слава Україні! 🇺🇦"
	)
	.refine(
		(v) => CALLSIGN_REGEX.test(v.trim().toUpperCase()),
		"Neteisingas šaukinio formatas (pvz. LY1AB, SP5ABC)"
	);
const emailSchema = z
	.email("Neteisingas el. pašto formatas")
	.trim()
	.min(1, "El. paštas yra privalomas");
const passwordSchema = z.string().min(1, "Slaptažodis yra privalomas");

const signUpSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	password: passwordSchema,
	confirmPassword: z.string(),
});

export interface SignUpProps {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
}

export function SignUp({
	className,
	socialLayout,
	socialPosition = "bottom",
}: SignUpProps) {
	const {
		authClient,
		basePaths,
		emailAndPassword,
		localization,
		plugins,
		redirectTo,
		socialProviders,
		viewPaths,
		navigate,
	} = useAuth();

	const usernameConfig = useAuthPlugin(usernamePlugin);
	const hasMagicLink = plugins?.some((p) => p.id === "magicLink") ?? false;

	const { mutate: signUpEmail, isPending: signUpPending } = useSignUpEmail(
		authClient,
		{
			onError: (error) => {
				form.setFieldValue("password", "");
				form.setFieldValue("confirmPassword", "");
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
		}
	);

	const isPending = signUpPending;

	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
		useState(false);

	const passwordFieldSchema = emailAndPassword?.minPasswordLength
		? z
				.string()
				.min(1, "Slaptažodis yra privalomas")
				.min(
					emailAndPassword.minPasswordLength,
					`Slaptažodį turi sudaryti bent ${emailAndPassword.minPasswordLength} simboliai`
				)
		: passwordSchema;

	const schema = emailAndPassword?.minPasswordLength
		? signUpSchema.extend({ password: passwordFieldSchema })
		: signUpSchema;

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: schema,
		},
		onSubmit: ({ value }) => {
			if (
				emailAndPassword?.confirmPassword &&
				value.password !== value.confirmPassword
			) {
				toast.error(localization.auth.passwordsDoNotMatch);
				form.setFieldValue("password", "");
				form.setFieldValue("confirmPassword", "");
				return;
			}

			signUpEmail({
				name: value.name,
				email: value.email,
				password: value.password,
				...(usernameConfig
					? {
							username: value.name.trim(),
							...(usernameConfig.displayUsername
								? { displayUsername: value.name.trim() }
								: {}),
						}
					: {}),
			});
		},
	});

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
						<form
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit();
							}}
						>
							<FieldGroup>
								<form.Field name="name" validators={{ onBlur: nameSchema }}>
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<Label htmlFor="name">{localization.auth.name}</Label>

												<Input
													aria-invalid={isInvalid}
													className="uppercase"
													disabled={isPending}
													id="name"
													name="name"
													onBlur={field.handleBlur}
													onChange={(e) =>
														handleFieldChange(
															field,
															e.target.value.toUpperCase()
														)
													}
													placeholder={localization.auth.namePlaceholder}
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

								<form.Field name="email" validators={{ onBlur: emailSchema }}>
									{(field) => {
										const isInvalid =
											field.state.meta.isTouched && !field.state.meta.isValid;
										return (
											<Field data-invalid={isInvalid}>
												<Label htmlFor="email">{localization.auth.email}</Label>

												<Input
													aria-invalid={isInvalid}
													autoComplete="email"
													disabled={isPending}
													id="email"
													name="email"
													onBlur={field.handleBlur}
													onChange={(e) =>
														handleFieldChange(field, e.target.value)
													}
													placeholder={localization.auth.emailPlaceholder}
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
														onChange={(e) =>
															handleFieldChange(field, e.target.value)
														}
														placeholder={localization.auth.passwordPlaceholder}
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
																{isConfirmPasswordVisible ? (
																	<EyeOff />
																) : (
																	<Eye />
																)}
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

										{localization.auth.signUp}
									</Button>

									{hasMagicLink && (
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
							<a
								className="underline underline-offset-4"
								href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
							>
								{localization.auth.signIn}
							</a>
						</FieldDescription>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
