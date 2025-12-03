import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";

export default function ProfileLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Profilis",
          headerLargeTitle: true,
          headerTransparent: Platform.OS === "ios",
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
        }}
      />
      <Stack.Screen
        name="join-season"
        options={{
          title: "Prisijunk prie sezono",
          presentation: "fullScreenModal",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: "Uždaryti",
              icon: {
                name: "xmark",
                type: "sfSymbol",
              },
              onPress: () => router.back(),
            },
          ],
        }}
      />
    </Stack>
  );
}
