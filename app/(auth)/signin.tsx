import { Link } from "one";
import { SizableText, YStack } from "tamagui";
import { SignInForm } from "~/components/SignInForm";

export default function SignInPage() {
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
			<SignInForm />

			<Link href="/signup">
				<SizableText>Sign Up</SizableText>
			</Link>
		</YStack>
	);
}
