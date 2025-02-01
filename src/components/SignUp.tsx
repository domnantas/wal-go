import { useState } from "react";
import { YStack } from "tamagui";
import { authClient } from "~/authClient";

export const SignUp = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

	const signUp = async () => {
		const { data, error } = await authClient.signUp.email(
			{
				email,
				password,
				name,
			},
			{
				onRequest: (ctx) => {
					//show loading
				},
				onSuccess: (ctx) => {
					//redirect to the dashboard
				},
				onError: (ctx) => {
					alert(ctx.error.message);
				},
			},
		);

		console.log({ data, error });
	};

	return (
		<YStack>
			<input
				type="email"
				placeholder="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
			/>
			<input
				type="text"
				value={name}
				placeholder="callsign"
				onChange={(e) => setName(e.target.value)}
			/>
			<input
				type="password"
				placeholder="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			/>
			<button type="button" onClick={signUp}>
				Sign Up
			</button>
		</YStack>
	);
};
