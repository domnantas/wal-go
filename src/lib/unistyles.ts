import { StyleSheet } from "react-native-unistyles";

const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
  "8xl": 96,
  "9xl": 128,
};

const boxShadows = {
  "2xs": "0 1px rgba(0 0 0 / 0.05)",
  xs: "0 1px 2px 0 rgba(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgba(0 0 0 / 0.1), 0 1px 2px -1px rgba(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgba(0 0 0 / 0.1), 0 2px 4px -2px rgba(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgba(0 0 0 / 0.1), 0 4px 6px -4px rgba(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgba(0 0 0 / 0.1), 0 8px 10px -6px rgba(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgba(0 0 0 / 0.25)",
};

const commonTheme = {
  fontSize: (size: keyof typeof fontSizes) => fontSizes[size],
  shadow: (size: keyof typeof boxShadows) => boxShadows[size],
  gap: (v: number) => v * 4,
  radius: 6,
};

const lightTheme = {
  colors: {
    background: "hsl(0, 0%, 100%)",
    foreground: "hsl(240, 10%, 3.9%)",
    card: "hsl(0, 0%, 100%)",
    cardForeground: "hsl(240, 10%, 3.9%)",
    popover: "hsl(0, 0%, 100%)",
    popoverForeground: "hsl(240, 10%, 3.9%)",
    primary: "hsl(240, 5.9%, 10%)",
    primaryForeground: "hsl(0, 0%, 98%)",
    secondary: "hsl(240, 4.8%, 95.9%)",
    secondaryForeground: "hsl(240, 5.9%, 10%)",
    muted: "hsl(240, 4.8%, 95.9%)",
    mutedForeground: "hsl(240, 3.8%, 46.1%)",
    accent: "hsl(240, 4.8%, 95.9%)",
    accentForeground: "hsl(240, 5.9%, 10%)",
    destructive: "hsl(0, 84.2%, 60.2%)",
    destructiveForeground: "hsl(0, 0%, 98%)",
    border: "hsl(240, 5.9%, 90%)",
    input: "hsl(240, 5.9%, 90%)",
    ring: "hsla(240, 5.9%, 10%, 50%)",
    chart1: "hsl(12, 76%, 61%)",
    chart2: "hsl(173, 58%, 39%)",
    chart3: "hsl(197, 37%, 24%)",
    chart4: "hsl(43, 74%, 66%)",
    chart5: "hsl(27, 87%, 67%)",
  },
  ...commonTheme,
};

const darkTheme = {
  colors: {
    background: "hsl(240, 10%, 3.9%)",
    foreground: "hsl(0, 0%, 98%)",
    card: "hsl(240, 10%, 3.9%)",
    cardForeground: "hsl(0, 0%, 98%)",
    popover: "hsl(240, 10%, 3.9%)",
    popoverForeground: "hsl(0, 0%, 98%)",
    primary: "hsl(0, 0%, 98%)",
    primaryForeground: "hsl(240, 5.9%, 10%)",
    secondary: "hsl(240, 3.7%, 15.9%)",
    secondaryForeground: "hsl(0, 0%, 98%)",
    muted: "hsl(240, 3.7%, 15.9%)",
    mutedForeground: "hsl(240, 5%, 64.9%)",
    accent: "hsl(240, 3.7%, 15.9%)",
    accentForeground: "hsl(0, 0%, 98%)",
    destructive: "hsl(0, 62.8%, 30.6%)",
    destructiveForeground: "hsl(0, 0%, 98%)",
    border: "hsl(240, 3.7%, 15.9%)",
    input: "hsl(240, 3.7%, 15.9%)",
    ring: "hsla(240, 4.9%, 83.9%, 50%)",
    chart1: "hsl(220, 70%, 50%)",
    chart2: "hsl(160, 60%, 45%)",
    chart3: "hsl(30, 80%, 55%)",
    chart4: "hsl(280, 65%, 60%)",
    chart5: "hsl(340, 75%, 55%)",
  },
  ...commonTheme,
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
