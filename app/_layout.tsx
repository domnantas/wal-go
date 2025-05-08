import "~/tamagui/tamagui.css";
import "./_layout.css";

import { SchemeProvider } from "@vxrn/color-scheme";
import { LoadProgressBar, Slot } from "one";
import { TamaguiRootProvider } from "../src/tamagui/TamaguiRootProvider";
import { ZeroProvider } from "@rocicorp/zero/react";
import { useState } from "react";
import { useZeroEmit, zero } from "~/zero";
import { useSetZeroAuthEffect } from "~/auth/authEffects";

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

export default function Layout() {
	const [zeroInstance, setZeroInstance] = useState(zero);

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
							<Slot />
						</TamaguiRootProvider>
					</SchemeProvider>
				</ZeroProvider>
			</body>
		</html>
	);
}
