import { TextInput } from "@/components/TextInput";
import { authClient } from "@/lib/auth-client";
import { Link } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

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
      />
      <TextInput
        placeholder="Slaptažodis"
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Prisijungti" onPress={handleLogin} />
      <Link href="/sign-up" withAnchor>
        Registracija
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
