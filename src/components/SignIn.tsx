import { useRouter } from "one";
import { useState } from "react";
import { Button, Input, YStack } from "tamagui";
import { authClient } from "~/auth/authClient";

export const SignIn = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const router = useRouter();

	const signIn = async () => {
		const { data, error } = await authClient.signIn.email(
			{
				email,
				password,
			},
			{
				onRequest: (ctx) => {
					//show loading
				},
				onSuccess: (ctx) => {
					router.push("/");
				},
				onError: (ctx) => {
					alert(ctx.error.message);
				},
			},
		);

		console.log({ data, error });
	};

	return (
		<YStack
			minH="100%"
			gap="$4"
			px="$4"
			items="center"
			justify="center"
			flex={1}
		>
			<Input
				inputMode="email"
				autoComplete="email"
				placeholder="email"
				value={email}
				onChangeText={(text) => setEmail(text)}
				width={200}
			/>
			<Input
				autoComplete="new-password"
				secureTextEntry={true}
				placeholder="password"
				value={password}
				onChangeText={(text) => setPassword(text)}
				width={200}
			/>
			<Button onPress={signIn}>Sign In</Button>
		</YStack>
	);
};
