import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Account } from "jazz-tools";
import { useAccount } from "jazz-tools/expo";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
  const { me, logOut } = useAccount(Account, { resolve: { profile: true } });
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      logOut();
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const callsign = me?.profile.name.toUpperCase() ?? "-";

  return (
    <View style={styles.container}>
      <Text style={styles.callsignLabel}>Šaukinys</Text>
      <Text style={styles.callsignValue}>{callsign}</Text>
      <TouchableOpacity
        onPress={handleSignOut}
        style={styles.signOutButton}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Atsijungti</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  callsignLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  callsignValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 24,
    color: "#111827",
  },
  signOutButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
