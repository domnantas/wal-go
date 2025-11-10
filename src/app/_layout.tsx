import { ClerkLoaded, ClerkProvider, useClerk } from "@clerk/clerk-expo";
import { resourceCache } from "@clerk/clerk-expo/resource-cache";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { JazzExpoProviderWithClerk } from "jazz-tools/expo";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../polyfills";

function JazzWithClerkProvider({ children }: { children: ReactNode }) {
  const clerk = useClerk();

  return (
    <JazzExpoProviderWithClerk
      clerk={clerk}
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${process.env.EXPO_PUBLIC_JAZZ_API_KEY}`,
      }}
      // AccountSchema={WalGoAccount}
    >
      {children}
    </JazzExpoProviderWithClerk>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const scheme = useColorScheme();

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      <ClerkLoaded>
        <JazzWithClerkProvider>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <ThemeProvider
                value={scheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <StatusBar style="auto" />
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </JazzWithClerkProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
