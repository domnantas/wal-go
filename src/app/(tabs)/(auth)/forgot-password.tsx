import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
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

const FALLBACK_ERROR = "Įvyko klaida. Pabandykite dar kartą.";

const extractErrorMessage = (unknownError: unknown) => {
  if (typeof unknownError === "object" && unknownError !== null) {
    const candidate = unknownError as {
      errors?: { longMessage?: string; message?: string }[];
      message?: string;
    };

    if (candidate.errors?.length) {
      return (
        candidate.errors[0]?.longMessage ||
        candidate.errors[0]?.message ||
        candidate.message ||
        FALLBACK_ERROR
      );
    }

    if (candidate.message) {
      return candidate.message;
    }
  }

  return FALLBACK_ERROR;
};

export default function ForgotPassword() {
  const { supabase } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [requestComplete, setRequestComplete] = useState(false);

  const handleRequestLink = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailAddress
      );

      if (error) {
        throw error;
      }

      setRequestComplete(true);
      setStatusMessage("Išsiuntėme nuorodą. Patikrinkite savo el. paštą.");
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.replace("/sign-in");
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.formCard}>
          <Text style={styles.heading}>
            {requestComplete
              ? "Patikrinkite paštą"
              : "Pamiršote slaptažodį?"}
          </Text>
          <Text style={styles.subheading}>
            {requestComplete
              ? "Atsiųsime nuorodą slaptažodžio atkūrimui. Atidarykite ją el. pašte."
              : "Įrašykite el. paštą ir atsiųsime atkūrimo nuorodą."}
          </Text>

          {!requestComplete && (
            <>
              <Text style={styles.label}>El. paštas</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                value={emailAddress}
                placeholder="El. paštas"
                placeholderTextColor="#9a9a9a"
                onChangeText={setEmailAddress}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={handleRequestLink}
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Siunčiame..." : "Siųsti nuorodą"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {requestComplete && (
            <TouchableOpacity
              onPress={handleGoBack}
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Grįžti į prisijungimą</Text>
            </TouchableOpacity>
          )}

          {statusMessage ? (
            <Text style={styles.statusText}>{statusMessage}</Text>
          ) : null}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
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
  buttonDisabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    color: "#047857",
  },
  errorText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    color: "#dc2626",
  },
});
