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
import { handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useRequestPasswordReset } from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";

const forgotEmailSchema = z
	.email("Neteisingas el. pašto adresas")
	.min(1, "El. paštas yra privalomas");

const forgotPasswordSchema = z.object({
	email: forgotEmailSchema,
});

export interface ForgotPasswordProps {
	className?: string;
}

export function ForgotPassword({ className }: ForgotPasswordProps) {
	const { basePaths, localization, viewPaths, Link } = useAuth();

	const { mutate: requestPasswordReset, isPending } = useRequestPasswordReset({
		onSuccess: () => toast.success(localization.auth.passwordResetEmailSent),
	});

	const form = useForm({
		defaultValues: {
			email: "",
		},
		validators: {
			onSubmit: forgotPasswordSchema,
		},
		onSubmit: ({ value }) => {
			requestPasswordReset({ email: value.email });
		},
	});

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="font-semibold text-xl">
					{localization.auth.forgotPassword}
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
						<form.Field name="email" validators={{ onBlur: forgotEmailSchema }}>
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
											onChange={(e) => handleFieldChange(field, e.target.value)}
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
