import { Tabs, TabsList, TabsTrigger } from "@WAL-GO/ui/components/tabs";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "tanstack-theme-kit";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<Tabs className="ml-4" onValueChange={setTheme} value={theme ?? "system"}>
			<TabsList className="h-6! gap-0.5">
				<TabsTrigger
					aria-label="Sistemos"
					className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
					value="system"
				>
					<Monitor className="size-3" />
				</TabsTrigger>
				<TabsTrigger
					aria-label="Šviesi"
					className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
					value="light"
				>
					<Sun className="size-3" />
				</TabsTrigger>
				<TabsTrigger
					aria-label="Tamsi"
					className="size-5 p-0 hover:bg-accent/40 hover:text-foreground"
					value="dark"
				>
					<Moon className="size-3" />
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
