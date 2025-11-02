import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { JazzExpoProvider } from "jazz-tools/expo";
import "../polyfills";

export default function RootLayout() {
  return (
    <JazzExpoProvider
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${process.env.EXPO_PUBLIC_JAZZ_API_KEY}`,
      }}
    >
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </JazzExpoProvider>
  );
}
