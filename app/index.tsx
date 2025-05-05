import { Link } from "one";
import { Button, H1, SizableText, XStack, YStack } from "tamagui";
import { authClient, useAuth } from "~/authClient";
import { ToggleThemeButton } from "~/components/ToggleThemeButton";
import { useQuery } from "~/zero";

export default function HomePage() {
	const { loggedIn, user } = useAuth();

	const [users] = useQuery((q) => q.user.orderBy("created_at", "desc"));

	console.log(users);

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
			{loggedIn ? (
				<>
					<SizableText>{user?.name}</SizableText>
					<Button onPress={() => authClient.signOut()}>Logout</Button>
				</>
			) : (
				<>
					<Link href="/signup">
						<SizableText>Sign Up</SizableText>
					</Link>
					<Link href="/signin">
						<SizableText>Sign In</SizableText>
					</Link>
				</>
			)}

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
