import { ArrowLeft } from "@tamagui/lucide-icons";
import { Link } from "one";
import { Button, YStack } from "tamagui";
import { SignIn } from "~/components/SignIn";

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
			<SignIn />

			<Link asChild href="/">
				<Button icon={ArrowLeft}>Back</Button>
			</Link>
		</YStack>
	);
}
