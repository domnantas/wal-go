import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "WAL GO",
  slug: "wal-go",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/wal-go-logo-light.png",
  scheme: "walgo",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.domnantas.walgo",
    icon: {
      light: "./src/assets/images/wal-go-logo-light.png",
      dark: "./src/assets/images/wal-go-logo-dark.png",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/wal-go-logo-transparent.png",
      backgroundColor: "#fdfbf8",
    },
    edgeToEdgeEnabled: true,
    package: "com.domnantas.walgo",
  },
  web: {
    bundler: "metro",
    output: "server",
    favicon: "./src/assets/images/wal-go-logo-transparent.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./src/assets/images/wal-go-logo-light.png",
        imageWidth: 200,
        backgroundColor: "#fdfbf8",
        dark: {
          image: "./src/assets/images/wal-go-logo-dark.png",
          imageWidth: 200,
          backgroundColor: "#0c1014",
        },
      },
    ],
    "expo-secure-store",
    "expo-sqlite",
    // "expo-build-properties",
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsVersion: "11.16.1",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Show current location on map.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
