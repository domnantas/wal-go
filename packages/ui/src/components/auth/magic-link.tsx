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
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSignInMagicLink } from "@better-auth-ui/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { MagicLinkButton } from "./magic-link-button";
import { PasskeyButton } from "./passkey-button";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

const magicLinkSchema = z.object({
	email: z
		.email("Neteisingas el. pašto adresas")
		.min(1, "El. paštas yra privalomas"),
});

export interface MagicLinkProps {
	className?: string;
	socialLayout?: SocialLayout;
	socialPosition?: "top" | "bottom";
}

export function MagicLink({
	className,
	socialLayout,
	socialPosition = "bottom",
}: MagicLinkProps) {
	const {
		basePaths,
		baseURL,
		localization,
		passkey,
		redirectTo,
		socialProviders,
		viewPaths,
		Link,
	} = useAuth();

	const { mutate: signInMagicLink, isPending: magicLinkPending } =
		useSignInMagicLink({
			onSuccess: () => {
				form.reset();
				toast.success(localization.auth.magicLinkSent);
			},
		});

	const isPending = magicLinkPending;

	const form = useForm({
		defaultValues: {
			email: "",
		},
		validators: {
			onBlur: magicLinkSchema,
			onSubmit: magicLinkSchema,
		},
		onSubmit: ({ value }) => {
			signInMagicLink({
				email: value.email,
				callbackURL: `${baseURL}${redirectTo}`,
			});
		},
	});

	const showSeparator = socialProviders && socialProviders.length > 0;

	return (
		<Card className={cn("w-full max-w-sm", className)}>
			<CardHeader>
				<CardTitle className="text-xl">{localization.auth.signIn}</CardTitle>
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

					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<form.Field name="email">
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

							<div className="flex flex-col gap-3">
								<Button disabled={isPending} type="submit">
									{isPending && <Spinner />}

									{localization.auth.sendMagicLink}
								</Button>

								<MagicLinkButton isPending={isPending} view="magicLink" />

								{passkey && <PasskeyButton isPending={isPending} />}
							</div>
						</FieldGroup>
					</form>

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
					<FieldDescription className="text-center">
						{localization.auth.needToCreateAnAccount}{" "}
						<Link
							className="underline underline-offset-4"
							href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
						>
							{localization.auth.signUp}
						</Link>
					</FieldDescription>
				</div>
			</CardContent>
		</Card>
	);
}
