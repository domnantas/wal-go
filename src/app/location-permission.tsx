import { useLocation } from "@/hooks/useLocation";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export default function LocationPermissionScreen() {
  const { permissionResponse, requestPermission } = useLocation();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleOpenSettings = () => {
    Linking.openURL("app-settings:");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Įjunkite buvimo vietos leidimą</Text>
          <Text style={styles.subtitle}>
            Kad žemėlapis ir WAL užpildymas veiktų, leiskite programai naudoti
            jūsų buvimo vietą.
          </Text>

          {!permissionResponse?.canAskAgain && (
            <Text style={styles.bodyText}>
              Leidimas buvo išjungtas. Atverkite programos nustatymus ir
              pasirinkite &ldquo;Vietos nustatymas&rdquo; → &ldquo;Leisti
              naudojant programą&rdquo;.
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {permissionResponse?.canAskAgain ? (
            <Pressable
              onPress={handleRequestPermission}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Suteikti leidimą</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Atidaryti nustatymus</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.tint,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderColor: theme.colors.separator,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
}));
