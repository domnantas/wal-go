import { IconSymbol } from "@/components/IconSymbol";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { Platform, Pressable } from "react-native";

export default function LogLayout() {
  const router = useRouter();
  const handleOpenForm = () => {};
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Žurnalas",
          headerLargeTitle: true,
          headerTransparent: Platform.OS === "ios",
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
          headerRight: () => (
            <Pressable
              accessibilityLabel="Naujas QSO"
              onPress={handleOpenForm}
              hitSlop={8}
            >
              <IconSymbol name="plus" size={32} />
            </Pressable>
          ),
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "Naujas QSO",
              icon: {
                name: "plus",
                type: "sfSymbol",
              },
              onPress: handleOpenForm,
            },
          ],
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Naujas QSO",
          presentation: "formSheet",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
          sheetAllowedDetents: "fitToContents",
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
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
