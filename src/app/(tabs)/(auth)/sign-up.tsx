import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await authClient.signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onError: (ctx) => {
          alert(ctx.error.message);
        },
        onSuccess: (ctx) => {
          router.replace("/profile");
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Šaukinys" value={name} onChangeText={setName} />
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
      <Button title="Užsiregistruoti" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
