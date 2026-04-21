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
import {
	ThemePreviewDark,
	ThemePreviewLight,
	ThemePreviewSystem,
	useAuth,
	useSession,
} from "@better-auth-ui/react";
import { Monitor, Moon, Sun } from "lucide-react";

export interface AppearanceProps {
	className?: string;
}

/**
 * Renders a theme selector card with visual theme previews.
 *
 * Displays a card containing radio buttons for selecting between system, light,
 * and dark themes. Each option shows a visual preview of the theme. Only renders
 * if theme settings are configured (theme, setTheme, and themes are provided).
 *
 * @param className - Optional additional CSS class names for the card container.
 * @returns A JSX element containing the theme selector card, or null if theme settings are not configured.
 */
export function Appearance({ className }: AppearanceProps) {
	const {
		localization,
		appearance: { theme, setTheme, themes },
	} = useAuth();
	const { data: session } = useSession();

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.appearance}
			</h2>

			<Card className={cn(className)}>
				<CardContent>
					<Field>
						<Label>{localization.settings.theme}</Label>

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

													{localization.settings.system}
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

													{localization.settings.light}
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

													{localization.settings.dark}
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
