import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (error) {
      console.error(error);
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
            placeholderTextColor="#9a9a9a"
            onChangeText={(emailAddressValue) =>
              setEmailAddress(emailAddressValue)
            }
            style={styles.input}
          />

          <Text style={styles.label}>Slaptažodis</Text>
          <TextInput
            value={password}
            placeholder="Slaptažodis"
            placeholderTextColor="#9a9a9a"
            secureTextEntry
            onChangeText={(passwordValue) => setPassword(passwordValue)}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={handleSignIn}
            style={styles.button}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Prisijungti</Text>
          </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginLeft: 24,
    marginRight: 24,
    gap: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  button: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#4b5563",
    fontSize: 14,
  },
  link: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryLink: {
    marginTop: 12,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
