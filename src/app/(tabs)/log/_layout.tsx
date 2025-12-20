import { IconSymbol } from "@/components/IconSymbol";
import { useSeasonParticipation } from "@/hooks/useSeasonParticipation";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { Alert, Platform, Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function LogLayout() {
  const router = useRouter();
  const { userParticipatingInActiveSeason, isLoading: isLoadingParticipation } =
    useSeasonParticipation();

  const handleOpenForm = () => {
    if (isLoadingParticipation) {
      return;
    }

    if (!userParticipatingInActiveSeason) {
      Alert.alert(
        "Prisijunkite prie sezono prieš pridedant QSO",
        "Profilis → Prisijungti prie sezono."
      );
      return;
    }
    router.push("/(tabs)/log/form");
  };
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
              <IconSymbol name="plus" size={32} style={styles.iconButton} />
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
          presentation: "modal",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
          ...(Platform.OS === "ios" && {
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: true,
          }),
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
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create((theme) => ({
  iconButton: {
    color: theme.colors.tint,
  },
}));
