import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/lib/powersync/system";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function SignIn() {
  const { supabase } = useAuth();
  const system = useSystem();
  const router = useRouter();
  const { theme } = useUnistyles();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailAddress,
        password,
      });

      if (error) {
        throw error;
      }

      await system.connectIfSignedIn();
      router.replace("/");
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
    }
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>El. paštas</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailAddress}
            placeholder="El. paštas"
            placeholderTextColor={theme.colors.textSecondary}
            onChangeText={(emailAddressValue) =>
              setEmailAddress(emailAddressValue)
            }
            style={styles.input}
          />

          <Text style={styles.label}>Slaptažodis</Text>
          <TextInput
            value={password}
            placeholder="Slaptažodis"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            onChangeText={(passwordValue) => setPassword(passwordValue)}
            style={styles.input}
          />

          <Pressable
            onPress={handleSignIn}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Prisijungti</Text>
          </Pressable>

          <Link href="/forgot-password" style={styles.secondaryLink}>
            Pamiršote slaptažodį?
          </Link>
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkPrompt}>Neturite paskyros?</Text>
          <Link href="/sign-up" style={styles.link}>
            Registracija
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: 24,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    marginLeft: 24,
    marginRight: 24,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: theme.colors.separator,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  button: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },
  linkPrompt: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: theme.colors.tint,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryLink: {
    marginTop: 12,
    color: theme.colors.tint,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
}));
