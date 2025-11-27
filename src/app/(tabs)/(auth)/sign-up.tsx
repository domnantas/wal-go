import { useAuth } from "@/hooks/useAuth";
import { useSystem } from "@/lib/powersync/system";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { z } from "zod";

const callsignSchema = z
  .string()
  .min(1, "Šaukinys yra privalomas")
  .min(3, "Šaukinys turi būti bent 3 simbolių")
  .max(10, "Šaukinys negali viršyti 10 simbolių")
  .regex(/^[A-Z0-9]+$/, "Šaukinys gali turėti tik raides ir skaičius");

export default function SignUp() {
  const { supabase } = useAuth();
  const system = useSystem();
  const router = useRouter();
  const { theme } = useUnistyles();

  const [callsign, setCallsign] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = async () => {
    const callsignResult = callsignSchema.safeParse(callsign);
    if (!callsignResult.success) {
      Alert.alert("Klaida", callsignResult.error.issues[0].message);
      return;
    }

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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>Šaukinys</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            value={callsign}
            placeholder="LY1ABC"
            placeholderTextColor={theme.colors.textSecondary}
            onChangeText={setCallsign}
            style={styles.input}
          />

          <Text style={styles.label}>El. paštas</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={emailAddress}
            placeholder="el.pastas@pvz.lt"
            placeholderTextColor={theme.colors.textSecondary}
            onChangeText={setEmailAddress}
            style={styles.input}
          />

          <Text style={styles.label}>Slaptažodis</Text>
          <TextInput
            value={password}
            placeholder="Slaptažodis"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />

          <Pressable
            onPress={handleSignUp}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Užsiregistruoti</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
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
  link: {
    color: theme.colors.tint,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
}));
