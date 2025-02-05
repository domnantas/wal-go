import { ArrowLeft } from "@tamagui/lucide-icons";
import { Link } from "one";
import { Button, YStack } from "tamagui";
import { SignUp } from "~/components/SignUp";

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
			<SignUp />

			<Link asChild href="/">
				<Button icon={ArrowLeft}>Back</Button>
			</Link>
		</YStack>
	);
}
