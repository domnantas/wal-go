import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Link, Stack, useRouter } from "expo-router";

export default function LogLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Žurnalas",
          headerStyle: {
            backgroundColor: isLiquidGlassAvailable() ? "transparent" : "white",
          },
          headerRight: () => (
            <Link href="/log/form">
              <MaterialIcons name="add" size={32} />
            </Link>
          ),
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "Add",
              icon: {
                name: "plus",
                type: "sfSymbol",
              },
              onPress: () => router.navigate("/log/form"),
            },
          ],
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Naujas įrašas",
          presentation: "formSheet",
          headerLargeTitle: false,
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "Add",
              icon: {
                name: "checkmark",
                type: "sfSymbol",
              },
              onPress: () => router.back(),
            },
          ],
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: "Add",
              icon: {
                name: "xmark",
                type: "sfSymbol",
              },
              onPress: () => router.back(),
            },
          ],
          // headerShown: false,
          // sheetAllowedDetents: "fitToContents",
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
