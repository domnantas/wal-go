import { Stack } from "one";
import { useAuth } from "~/auth/authClient";

export default function Layout() {
	const { loggedIn } = useAuth();

	return (
		<Stack>
			{loggedIn ? (
				<Stack.Screen name="account" options={{ title: "Account" }} />
			) : (
				<>
					<Stack.Screen name="signin" options={{ title: "Sign In" }} />
					<Stack.Screen name="signup" options={{ title: "Sign Up" }} />
				</>
			)}
		</Stack>
	);
}
