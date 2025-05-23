import { StyleSheet } from "react-native-unistyles";

const lightTheme = {
  colors: {
    background: "hsl(36, 56%, 98%)",
    foreground: "hsl(0, 0%, 3.9%)",
    card: "hsl(36, 56%, 98%)",
    cardForeground: "hsl(0, 0%, 3.9%)",
    popover: "hsl(36, 56%, 98%)",
    popoverForeground: "hsl(0, 0%, 3.9%)",
    primary: "hsl(0, 72.2%, 50.6%)",
    primaryForeground: "hsl(0, 85.7%, 97.3%)",
    secondary: "hsl(0, 0%, 96.1%)",
    secondaryForeground: "hsl(0, 0%, 9%)",
    muted: "hsl(0, 0%, 96.1%)",
    mutedForeground: "hsl(0, 0%, 45.1%)",
    accent: "hsl(0, 0%, 96.1%)",
    accentForeground: "hsl(0, 0%, 9%)",
    destructive: "hsl(0, 84.2%, 60.2%)",
    destructiveForeground: "hsl(0, 0%, 98%)",
    border: "hsl(0, 0%, 89.8%)",
    input: "hsl(0, 0%, 89.8%)",
    ring: "hsl(0, 72.2%, 50.6%)",
    chart1: "hsl(12, 76%, 61%)",
    chart2: "hsl(173, 58%, 39%)",
    chart3: "hsl(197, 37%, 24%)",
    chart4: "hsl(43, 74%, 66%)",
    chart5: "hsl(27, 87%, 67%)",
  },
  gap: (v: number) => v * 8,
  radius: "0.5rem",
};

const darkTheme = {
  colors: {
    background: "hsl(0, 0%, 3.9%)",
    foreground: "hsl(0, 0%, 98%)",
    card: "hsl(0, 0%, 3.9%)",
    cardForeground: "hsl(0, 0%, 98%)",
    popover: "hsl(0, 0%, 3.9%)",
    popoverForeground: "hsl(0, 0%, 98%)",
    primary: "hsl(0, 72.2%, 50.6%)",
    primaryForeground: "hsl(0, 85.7%, 97.3%)",
    secondary: "hsl(0, 0%, 14.9%)",
    secondaryForeground: "hsl(0, 0%, 98%)",
    muted: "hsl(0, 0%, 14.9%)",
    mutedForeground: "hsl(0, 0%, 63.9%)",
    accent: "hsl(0, 0%, 14.9%)",
    accentForeground: "hsl(0, 0%, 98%)",
    destructive: "hsl(0, 62.8%, 30.6%)",
    destructiveForeground: "hsl(0, 0%, 98%)",
    border: "hsl(0, 0%, 14.9%)",
    input: "hsl(0, 0%, 14.9%)",
    ring: "hsl(0, 72.2%, 50.6%)",
    chart1: "hsl(220, 70%, 50%)",
    chart2: "hsl(160, 60%, 45%)",
    chart3: "hsl(30, 80%, 55%)",
    chart4: "hsl(280, 65%, 60%)",
    chart5: "hsl(340, 75%, 55%)",
  },
  gap: (v: number) => v * 8,
  radius: "0.5rem",
};

const appThemes = {
  light: lightTheme,
  dark: darkTheme,
};

const breakpoints = {
  xs: 0,
  sm: 300,
  md: 500,
  lg: 800,
  xl: 1200,
};

type AppBreakpoints = typeof breakpoints;
type AppThemes = typeof appThemes;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: {
    adaptiveThemes: true,
  },
  breakpoints,
  themes: appThemes,
});
