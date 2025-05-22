import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  // Disabling base url to make it work on physical devices
  // baseURL: "",
  plugins: [
    expoClient({
      scheme: "walgo",
      storagePrefix: "walgo",
      storage: SecureStore,
    }),
  ],
});
