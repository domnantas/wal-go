import { Team, TEAM_LABELS } from "@/constants/team";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonParticipation } from "@/hooks/useSeasonParticipation";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

function formatSeasonDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Profile() {
  const { session, signOut } = useAuth();
  const { activeSeason } = useActiveSeason();
  const { userParticipatingInActiveSeason, team } = useSeasonParticipation();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const handleJoinSeason = () => {
    router.push("/(tabs)/profile/join-season");
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

      {activeSeason && (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Sezonas</Text>
            <Text style={styles.value}>{activeSeason.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Sezono pradžia</Text>
            <Text style={styles.value}>
              {formatSeasonDate(activeSeason.startsAt)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Sezono pabaiga</Text>
            <Text style={styles.value}>
              {formatSeasonDate(activeSeason.endsAt)}
            </Text>
          </View>
          <View style={styles.divider} />
          {userParticipatingInActiveSeason && team ? (
            <View style={styles.row}>
              <Text style={styles.label}>Komanda</Text>
              <View style={[styles.teamBadge(team)]}>
                <Text style={styles.teamBadgeText}>{TEAM_LABELS[team]}</Text>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleJoinSeason}
              style={({ pressed }) => [
                styles.row,
                styles.joinRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.label, styles.joinText]}>
                Prisijungti prie sezono
              </Text>
              <Text style={[styles.value, styles.joinText]}>→</Text>
            </Pressable>
          )}
        </View>
      )}

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

const styles = StyleSheet.create((theme) => {
  const TEAM_COLOR_MAP = {
    yellow: theme.colors.teamYellow,
    green: theme.colors.teamGreen,
    red: theme.colors.teamRed,
  };
  return {
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
      alignItems: "flex-start",
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
      textAlign: "right",
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
    teamBadge: (team: Team) => {
      return {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: TEAM_COLOR_MAP[team],
      };
    },
    teamBadgeText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#000",
    },
    joinRow: {
      cursor: "pointer",
    },
    joinText: {
      color: theme.colors.tint,
    },
  };
});
