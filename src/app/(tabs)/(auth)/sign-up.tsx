import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/lib/powersync/system";
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

export default function SignUp() {
  const { supabase } = useAuth();
  const system = useSystem();
  const router = useRouter();

  const [callsign, setCallsign] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailAddress,
        password,
        options: {
          data: { callsign },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await system.connectIfSignedIn();
        router.replace("/");
        return;
      }

      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <View style={styles.formCard}>
            <Text style={styles.heading}>Patikrinkite paštą</Text>
            <Text style={styles.subheading}>
              Patvirtinimo nuoroda išsiųsta. Atidarykite ją el. pašte, kad
              užbaigtumėte registraciją.
            </Text>
            <Link href="/sign-in" style={styles.link}>
              Grįžti į prisijungimą
            </Link>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>Šaukinys</Text>
          <TextInput
            autoCapitalize="none"
            value={callsign}
            placeholder="Šaukinys"
            placeholderTextColor="#9a9a9a"
            onChangeText={(value) => {
              const normalizedCallsign = value
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase();
              setCallsign(normalizedCallsign);
            }}
            style={styles.input}
          />

          <Text style={styles.label}>El. paštas</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailAddress}
            placeholder="El. paštas"
            placeholderTextColor="#9a9a9a"
            onChangeText={(email) => setEmailAddress(email)}
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
            onPress={handleSignUp}
            style={styles.button}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Užsiregistruoti</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
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
  link: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
});
