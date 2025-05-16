import "~/tamagui/tamagui.css";
import "./_layout.css";

import { SchemeProvider } from "@vxrn/color-scheme";
import { LoadProgressBar, Slot, Tabs } from "one";
import { ZeroProvider } from "@rocicorp/zero/react";
import { useState } from "react";
import { useZeroEmit, zero } from "~/zero";
import { useSetZeroAuthEffect } from "~/auth/authEffects";
import { useAuth } from "~/auth/authClient";
import { TamaguiRootProvider } from "~/tamagui/TamaguiRootProvider";
import { SplashScreen } from "~/components/SplashScreen";
import { isWeb } from "tamagui";
import { CircleUser, Map as MapIcon, NotebookPen } from "@tamagui/lucide-icons";

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

export default function Layout() {
	const [zeroInstance, setZeroInstance] = useState(zero);
	const { loggedIn, loading } = useAuth();

	useZeroEmit((next) => {
		setZeroInstance(next);
	});

	useSetZeroAuthEffect();

	return (
		<html lang="en-US">
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=5"
				/>
				<link rel="icon" href="/favicon.svg" />

				<title>WAL GO</title>
			</head>

			<body>
				<LoadProgressBar />

				<ZeroProvider zero={zeroInstance}>
					<SchemeProvider>
						<TamaguiRootProvider>
							{loading ? (
								<SplashScreen />
							) : isWeb ? (
								<Slot />
							) : (
								<Tabs>
									<Tabs.Screen
										name="map"
										options={{
											title: "Žemėlapis",
											href: "/map",
											tabBarIcon: ({ color }) => (
												<MapIcon size={20} color={color} />
											),
										}}
									/>
									{loggedIn && (
										<Tabs.Screen
											name="log"
											options={{
												title: "Žurnalas",
												href: "/log",
												tabBarIcon: ({ color }) => (
													<NotebookPen size={20} color={color} />
												),
											}}
										/>
									)}
									<Tabs.Screen
										name="(auth)"
										options={{
											title: "Paskyra",
											href: "/account",
											tabBarIcon: ({ color }) => (
												<CircleUser size={20} color={color} />
											),
										}}
									/>
								</Tabs>
								// <Stack screenOptions={{ headerShown: false }}>
								// 	{loggedIn ? (
								// 		<Stack.Screen name="index" />
								// 	) : (
								// 		<Stack.Screen name="(auth)" />
								// 	)}
								// </Stack>
							)}

							{/* <Tabs screenOptions={{ headerShown: false }}>
								<Tabs.Screen
									name="map"
									options={{
										title: "Žemėlapis",
										href: "/map",
									}}
								/>
								<Tabs.Screen
									name="index"
									options={{
										title: "Žurnalas",
										href: "/",
									}}
								/>
							</Tabs> */}
						</TamaguiRootProvider>
					</SchemeProvider>
				</ZeroProvider>
			</body>
		</html>
	);
}
