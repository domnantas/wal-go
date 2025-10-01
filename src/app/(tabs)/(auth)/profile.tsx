import { authClient } from "@/lib/auth-client";
import { Button, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function Profile() {
  const { data } = authClient.useSession();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{data?.user.name}</Text>
      <Button
        title="Atsijungti"
        onPress={() => {
          authClient.signOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: theme.colors.foreground,
  },
}));
