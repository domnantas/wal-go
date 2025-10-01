import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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
      <TextInput
        placeholder="Šaukinys"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCorrect={false}
        autoCapitalize="characters"
        returnKeyType="next"
      />
      <TextInput
        placeholder="El. paštas"
        value={email}
        onChangeText={setEmail}
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
      />
      <Button onPress={handleLogin}>Užsiregistruoti</Button>
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
