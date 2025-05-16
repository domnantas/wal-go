import { Link } from "one";
import { Button, SizableText, YStack } from "tamagui";
import { authClient, useAuth } from "~/auth/authClient";

export default function AccountPage() {
	const { loggedIn, user } = useAuth();

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
		</YStack>
	);
}
