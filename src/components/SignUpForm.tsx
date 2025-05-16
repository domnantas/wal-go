import { useRouter } from "one";
import { useState } from "react";
import { Button, Input } from "tamagui";
import { authClient } from "~/auth/authClient";

export const SignUpForm = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [callsign, setCallsign] = useState("");
	const router = useRouter();

	const signUp = async () => {
		const { data, error } = await authClient.signUp.email(
			{
				email,
				password,
				name: callsign,
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
				value={callsign}
				placeholder="callsign"
				onChangeText={(text) => setCallsign(text)}
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
			<Button onPress={signUp}>Sign Up</Button>
		</>
	);
};
