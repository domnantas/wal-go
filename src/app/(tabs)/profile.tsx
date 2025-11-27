import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Profile() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
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
      card: {
        backgroundColor: colors.card,
        borderRadius: 10,
        overflow: "hidden" as const,
      },
      row: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
      },
      label: {
        fontSize: 17,
        color: colors.text,
      },
      value: {
        fontSize: 17,
        color: colors.textSecondary,
      },
      divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.separator,
        marginLeft: 16,
      },
      signOutButton: {
        backgroundColor: colors.card,
        borderRadius: 10,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        paddingVertical: 12,
      },
      signOutText: {
        fontSize: 17,
        color: colors.destructive,
      },
    }),
    [colors]
  );

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={styles.content}
    >
      <View style={dynamicStyles.card}>
        <View style={dynamicStyles.row}>
          <Text style={dynamicStyles.label}>Šaukinys</Text>
          <Text style={dynamicStyles.value}>
            {session?.user.user_metadata?.callsign}
          </Text>
        </View>
        <View style={dynamicStyles.divider} />
        <View style={dynamicStyles.row}>
          <Text style={dynamicStyles.label}>El. paštas</Text>
          <Text style={dynamicStyles.value}>{session?.user.email}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [
          dynamicStyles.signOutButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={dynamicStyles.signOutText}>Atsijungti</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 35,
  },
  pressed: {
    opacity: 0.7,
  },
});
