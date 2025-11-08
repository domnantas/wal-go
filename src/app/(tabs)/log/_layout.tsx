import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";

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
          // headerRight: () => (
          //   <Link href="/log/form">
          //     <SymbolView name="plus" />
          //   </Link>
          // ),
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
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: "fitToContents",
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
