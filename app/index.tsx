import { useQuery } from "@rocicorp/zero/react";
import { Link } from "one";
import { Button, H1, SizableText, XStack, YStack } from "tamagui";
import { authClient, useAuth } from "~/auth/authClient";
import { ToggleThemeButton } from "~/components/ToggleThemeButton";
import { useZero } from "~/zero";
import { nanoid } from "nanoid";

export default function HomePage() {
	const { loggedIn, user } = useAuth();

	const z = useZero();
	const [users] = useQuery(z.query.user.orderBy("created_at", "desc"));
	const qsoQuery = z.query.qso.orderBy("created_at", "desc");
	const [qsos] = useQuery(qsoQuery);

	const logQso = (square: string) => {
		if (!user) {
			console.error("Must be logged in");
			return;
		}

		z.mutate.qso.insert({
			activator_callsign: user.name,
			activator_square: square,
			id: nanoid(),
			hunter_callsign: "LY0TEST",
			band: "20m",
			mode: "SSB",
		});
	};

	console.log({ users, qsos });

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
					<Button onPress={() => logQso("A01")}>A01</Button>
					<Button onPress={() => logQso("A02")}>A02</Button>
				</XStack>
				<XStack gap="$6">
					<Button onPress={() => logQso("B01")}>B01</Button>
					<Button onPress={() => logQso("B02")}>B02</Button>
				</XStack>

				<ToggleThemeButton />
			</YStack>
		</YStack>
	);
}
