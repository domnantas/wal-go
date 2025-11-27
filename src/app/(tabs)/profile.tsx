import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function Profile() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Šaukinys</Text>
          <Text style={styles.value}>
            {session?.user.user_metadata?.callsign}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>El. paštas</Text>
          <Text style={styles.value}>{session?.user.email}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.signOutText}>Atsijungti</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 35,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
  },
  label: {
    fontSize: 17,
    color: theme.colors.text,
  },
  value: {
    fontSize: 17,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.separator,
    marginLeft: 16,
  },
  signOutButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  signOutText: {
    fontSize: 17,
    color: theme.colors.destructive,
  },
}));
