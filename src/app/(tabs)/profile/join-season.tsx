import { TeamWheel } from "@/components/TeamWheel";
import { Team, TEAM_LABELS } from "@/constants/team";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonParticipation } from "@/hooks/useSeasonParticipation";
import { seasonParticipants } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { useCallback } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export default function JoinSeason() {
  const { drizzle } = useSystem();
  const { isSignedIn, userId } = useAuth();
  const { activeSeason } = useActiveSeason();
  const { userParticipatingInActiveSeason, team } = useSeasonParticipation();

  const handleTeamSelected = useCallback(
    async (team: Team) => {
      if (userParticipatingInActiveSeason) {
        Alert.alert("Jau prisijungėte", "Jūs jau esate šiame sezone.");
        return;
      }

      if (!activeSeason) {
        Alert.alert("Klaida", "Nėra aktyvaus sezono.");
        return;
      }

      if (!isSignedIn || !userId) {
        Alert.alert("Klaida", "Turite būti prisijungę.");
        return;
      }

      try {
        await drizzle.insert(seasonParticipants).values({
          userId,
          seasonId: activeSeason.id,
          team,
        });
      } catch (error) {
        console.error("Failed to join season:", error);
        Alert.alert(
          "Klaida",
          "Nepavyko prisijungti prie sezono. Bandykite dar kartą."
        );
      }
    },
    [userParticipatingInActiveSeason, activeSeason, isSignedIn, userId, drizzle]
  );

  if (!activeSeason) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noSeasonText}>Šiuo metu nėra aktyvaus sezono.</Text>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.seasonLabel}>{activeSeason.name}</Text>
        <Text style={styles.seasonDates}>
          {formatDate(activeSeason.startsAt)} -{" "}
          {formatDate(activeSeason.endsAt)}
        </Text>
      </View>

      <View style={styles.content}>
        <TeamWheel
          onTeamSelected={handleTeamSelected}
          disabled={userParticipatingInActiveSeason}
        />
        {userParticipatingInActiveSeason && team && (
          <View style={[styles.teamBadge(team)]}>
            <Text style={styles.teamText}>
              Pasirinkta komanda: {TEAM_LABELS[team]}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
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
    header: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      alignItems: "center",
      gap: 8,
    },
    seasonLabel: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
    },
    seasonDates: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    noSeasonText: {
      flex: 1,
      textAlign: "center",
      textAlignVertical: "center",
      fontSize: 17,
      color: theme.colors.textSecondary,
      paddingHorizontal: 24,
    },
    joinedBadge: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    joinedText: {
      fontSize: 16,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    teamBadge: (teamColor: Team) => ({
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: TEAM_COLOR_MAP[teamColor],
    }),
    teamText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#000000",
    },
  };
});
