import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { withUnistyles } from "react-native-unistyles";

const UniThemeProvider = withUnistyles(ThemeProvider, (theme) => ({
  value: {
    ...DefaultTheme,
    colors: {
      background: theme.colors.background,
      border: theme.colors.border,
      text: theme.colors.foreground,
      card: theme.colors.muted,
      notification: theme.colors.accent,
      primary: theme.colors.primary,
    },
  },
}));

export default function RootLayout() {
  return (
    <UniThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </UniThemeProvider>
  );
}
