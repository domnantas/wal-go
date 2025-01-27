import { Button, H1, XStack, YStack } from "tamagui";
import { ToggleThemeButton } from "~/interface/ToggleThemeButton";

export function HomePage() {
	return (
		<YStack
			bg="$color1"
			minH="100%"
			gap="$4"
			px="$4"
			items="center"
			justify="center"
			flex={1}
		>
			<H1 text="center">WAL GO</H1>
			<YStack items="center" gap="$6">
				<XStack gap="$6">
					<Button>A01</Button>
					<Button>A02</Button>
				</XStack>
				<XStack gap="$6">
					<Button>B01</Button>
					<Button>B02</Button>
				</XStack>

				<ToggleThemeButton />
			</YStack>
		</YStack>
	);
}
