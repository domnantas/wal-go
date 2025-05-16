import { Link } from "one";
import { isWeb, SizableText, YStack } from "tamagui";
import { SignUpForm } from "~/components/SignUpForm";

export default function SignUpPage() {
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
			<SignUpForm />

			{isWeb && (
				<Link href="/signin">
					<SizableText>Sign In</SizableText>
				</Link>
			)}
		</YStack>
	);
}
