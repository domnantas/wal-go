"use client";

import { Card, CardContent } from "@WAL-GO/ui/components/card";
import {
	Field,
	FieldContent,
	FieldLabel,
	FieldTitle,
} from "@WAL-GO/ui/components/field";
import { Label } from "@WAL-GO/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@WAL-GO/ui/components/radio-group";
import { cn } from "@WAL-GO/ui/lib/utils";
import { themePlugin } from "@better-auth-ui/core/plugins";
import {
	ThemePreviewDark,
	ThemePreviewLight,
	ThemePreviewSystem,
	useAuth,
	useAuthPlugin,
	useSession,
} from "@better-auth-ui/react";
import { Monitor, Moon, Sun } from "lucide-react";

export interface AppearanceProps {
	className?: string;
}

export function Appearance({ className }: AppearanceProps) {
	const { authClient } = useAuth();
	const { theme, setTheme, themes, localization } = useAuthPlugin(themePlugin);
	const { data: session } = useSession(authClient);

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">{localization.appearance}</h2>

			<Card className={cn(className)}>
				<CardContent>
					<Field>
						<Label>{localization.theme}</Label>

						<RadioGroup
							className="grid grid-cols-2 gap-3 sm:grid-cols-3"
							disabled={!(session && theme)}
							onValueChange={setTheme}
							value={session ? theme : ""}
						>
							{themes.includes("system") && (
								<FieldLabel htmlFor="system">
									<Field orientation="horizontal">
										<FieldContent className="gap-2">
											<div className="flex items-center justify-between gap-2">
												<FieldTitle>
													<Monitor className="size-4 text-muted-foreground" />

													{localization.system}
												</FieldTitle>

												<RadioGroupItem id="system" value="system" />
											</div>

											<ThemePreviewSystem className="w-full" />
										</FieldContent>
									</Field>
								</FieldLabel>
							)}

							{themes.includes("light") && (
								<FieldLabel htmlFor="light">
									<Field orientation="horizontal">
										<FieldContent className="gap-2">
											<div className="flex items-center justify-between gap-2">
												<FieldTitle>
													<Sun className="size-4 text-muted-foreground" />

													{localization.light}
												</FieldTitle>

												<RadioGroupItem id="light" value="light" />
											</div>

											<ThemePreviewLight className="w-full" />
										</FieldContent>
									</Field>
								</FieldLabel>
							)}

							{themes.includes("dark") && (
								<FieldLabel htmlFor="dark">
									<Field orientation="horizontal">
										<FieldContent className="gap-2">
											<div className="flex items-center justify-between gap-2">
												<FieldTitle>
													<Moon className="size-4 text-muted-foreground" />

													{localization.dark}
												</FieldTitle>

												<RadioGroupItem id="dark" value="dark" />
											</div>

											<ThemePreviewDark className="w-full" />
										</FieldContent>
									</Field>
								</FieldLabel>
							)}
						</RadioGroup>
					</Field>
				</CardContent>
			</Card>
		</div>
	);
}
