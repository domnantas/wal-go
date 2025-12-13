import { useLocation } from "@/hooks/useLocation";
import { useSystem } from "@/lib/powersync/system";
import "@/lib/unistyles";
import { PowerSyncContext } from "@powersync/react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../polyfills";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();

  const system = useSystem();
  const db = useMemo(() => {
    return system.powersync;
  }, [system.powersync]);

  const { permissionResponse } = useLocation();

  useEffect(() => {
    system.init();
  }, [system]);

  useEffect(() => {
    if (permissionResponse !== null) {
      SplashScreen.hideAsync();
    }
  }, [permissionResponse]);

  // Don't render routes until permission status is known
  if (permissionResponse === null) {
    return null;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Stack>
              <Stack.Protected guard={permissionResponse.granted}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack.Protected>
              <Stack.Protected guard={!permissionResponse.granted}>
                <Stack.Screen
                  name="location-permission"
                  options={{ headerShown: false }}
                />
              </Stack.Protected>
            </Stack>
          </ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </PowerSyncContext.Provider>
  );
}
