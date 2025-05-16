import { useRouter } from "one";
import { useState } from "react";
import { Button, Input } from "tamagui";
import { authClient } from "~/auth/authClient";

export const SignInForm = () => {
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
	};

	return (
		<>
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
		</>
	);
};
