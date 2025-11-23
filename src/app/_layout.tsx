import { useSystem } from "@/lib/powersync/system";
import { PowerSyncContext } from "@powersync/react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../polyfills";

export default function RootLayout() {
  const scheme = useColorScheme();

  const system = useSystem();
  const db = useMemo(() => {
    return system.powersync;
  }, []);

  useEffect(() => {
    system.init();
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </PowerSyncContext.Provider>
  );
}
