import { useAuth } from "@clerk/clerk-expo";
import { Stack } from "expo-router";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  return (
    <Stack>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ title: "Prisijungti" }} />
        <Stack.Screen name="sign-up" options={{ title: "Registracija" }} />
      </Stack.Protected>
    </Stack>
  );
}
