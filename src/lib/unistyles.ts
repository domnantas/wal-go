import { StyleSheet } from "react-native-unistyles";

const lightTheme = {
  colors: {
    background: "#F2F2F7",
    card: "#FFFFFF",
    text: "#000000",
    textSecondary: "#8E8E93",
    separator: "#C6C6C8",
    tint: "#007AFF",
    destructive: "#FF3B30",
  },
};

const darkTheme = {
  colors: {
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    separator: "#38383A",
    tint: "#0A84FF",
    destructive: "#FF453A",
  },
};

type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  settings: {
    adaptiveThemes: true,
  },
});
