import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { useSystem } from "@/lib/powersync/system";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const colors = useColors();

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

  const dynamicStyles = useMemo(
    () => ({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      formCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 24,
        gap: 12,
      },
      heading: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: colors.text,
        textAlign: "center" as const,
      },
      subheading: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center" as const,
        marginTop: 4,
        marginBottom: 16,
      },
      label: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: colors.textSecondary,
      },
      input: {
        height: 48,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.background,
      },
      button: {
        marginTop: 16,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.tint,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      buttonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700" as const,
        letterSpacing: 0.3,
      },
      link: {
        color: colors.tint,
        fontSize: 14,
        fontWeight: "600" as const,
        textAlign: "center" as const,
        marginTop: 8,
      },
    }),
    [colors]
  );

  if (pendingVerification) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <View style={dynamicStyles.formCard}>
            <Text style={dynamicStyles.heading}>Patikrinkite paštą</Text>
            <Text style={dynamicStyles.subheading}>
              Patvirtinimo nuoroda išsiųsta. Atidarykite ją el. pašte, kad
              užbaigtumėte registraciją.
            </Text>
            <Link href="/sign-in" style={dynamicStyles.link}>
              Grįžti į prisijungimą
            </Link>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.label}>Šaukinys</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            value={callsign}
            placeholder="LY1ABC"
            placeholderTextColor={colors.textSecondary}
            onChangeText={setCallsign}
            style={dynamicStyles.input}
          />

          <Text style={dynamicStyles.label}>El. paštas</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={emailAddress}
            placeholder="el.pastas@pvz.lt"
            placeholderTextColor={colors.textSecondary}
            onChangeText={setEmailAddress}
            style={dynamicStyles.input}
          />

          <Text style={dynamicStyles.label}>Slaptažodis</Text>
          <TextInput
            value={password}
            placeholder="Slaptažodis"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            onChangeText={setPassword}
            style={dynamicStyles.input}
          />

          <Pressable
            onPress={handleSignUp}
            style={({ pressed }) => [
              dynamicStyles.button,
              pressed && styles.pressed,
            ]}
          >
            <Text style={dynamicStyles.buttonText}>Užsiregistruoti</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});
