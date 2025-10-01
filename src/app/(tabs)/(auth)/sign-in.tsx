import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { authClient } from "@/lib/auth-client";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError: (ctx) => {
          alert(ctx.error.message);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="El. paštas"
        value={email}
        onChangeText={setEmail}
        autoFocus
        autoComplete="email"
        inputMode="email"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="next"
      />
      <TextInput
        placeholder="Slaptažodis"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="send"
      />
      <Button onPress={handleLogin}>Prisijungti</Button>
      <Link href="/sign-up" withAnchor asChild>
        <Button variant="link">Registracija</Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 20,
    maxWidth: 400,
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
  },
});
