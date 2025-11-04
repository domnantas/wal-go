import { WalGoAccount } from "@/schema";
import { ClerkLoaded, ClerkProvider, useClerk } from "@clerk/clerk-expo";
import { resourceCache } from "@clerk/clerk-expo/resource-cache";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { JazzExpoProviderWithClerk } from "jazz-tools/expo";
import type { ReactNode } from "react";
import "../polyfills";

function JazzWithClerkProvider({ children }: { children: ReactNode }) {
  const clerk = useClerk();

  return (
    <JazzExpoProviderWithClerk
      clerk={clerk}
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${process.env.EXPO_PUBLIC_JAZZ_API_KEY}`,
      }}
      AccountSchema={WalGoAccount}
    >
      {children}
    </JazzExpoProviderWithClerk>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </JazzWithClerkProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
