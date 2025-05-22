import { authClient } from "@/lib/auth-client";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Profile() {
  const { data } = authClient.useSession();
  return (
    <View style={styles.container}>
      <Text>{data?.user.name}</Text>
      <Button
        title="Atsijungti"
        onPress={() => {
          authClient.signOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
