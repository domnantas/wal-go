import { authClient } from "@/lib/auth-client";
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "sign-in",
};

export default function AuthLayout() {
  const { data } = authClient.useSession();
  const isLoggedIn = Boolean(data);

  return (
    <Stack>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="sign-in" options={{ title: "Prisijungti" }} />
        <Stack.Screen name="sign-up" options={{ title: "Registracija" }} />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="profile"
          options={{ title: data?.user.name ?? "Profilis" }}
        />
      </Stack.Protected>
    </Stack>
  );
}
