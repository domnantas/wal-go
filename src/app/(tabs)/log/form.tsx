import { VALID_WAL, type WALCode } from "@/constants/wal";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { useSeasonParticipation } from "@/hooks/useSeasonParticipation";
import { qsos } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { qsoSchema, VALID_MODES } from "@/lib/validations/qso";
import { calculateWAL } from "@/lib/wal-grid";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function LogForm() {
  const navigation = useNavigation();
  const router = useRouter();
  const { drizzle } = useSystem();
  const { userId, isSignedIn } = useAuth();
  const { activeSeason } = useActiveSeason();
  const { userParticipatingInActiveSeason } = useSeasonParticipation();
  const { theme } = useUnistyles();
  const { coordinates, requestPermission, permissionResponse } = useLocation();

  const [receivedCallsign, setReceivedCallsign] = useState("");
  const [receivedWAL, setReceivedWAL] = useState("");
  const [receivedRST, setReceivedRST] = useState("");
  const [sentRST, setSentRST] = useState("");
  const [frequency, setFrequency] = useState("");
  const [mode, setMode] = useState<(typeof VALID_MODES)[number]>("SSB");

  const isLoadingLocation = permissionResponse?.granted && !coordinates;

  // Calculate WAL code from coordinates
  const walCode = useMemo(() => {
    if (!coordinates) return null;
    const wal = calculateWAL(coordinates.latitude, coordinates.longitude);
    return VALID_WAL.includes(wal as WALCode) ? wal : null;
  }, [coordinates]);

  // User has coordinates but is outside any valid WAL square
  const isOutsideWALGrid = coordinates !== null && walCode === null;

  const handleSubmit = useCallback(async () => {
    if (!isSignedIn || !userId) {
      Alert.alert("Klaida", "Turite būti prisijungę, kad pridėtumėte QSO.");
      return;
    }

    if (!activeSeason) {
      Alert.alert("Klaida", "Šiuo metu nėra aktyvaus sezono.");
      return;
    }

    if (!userParticipatingInActiveSeason) {
      Alert.alert(
        "Klaida",
        "Turite prisijungti prie sezono prieš pridedant QSO."
      );
      return;
    }

    if (isOutsideWALGrid) {
      Alert.alert(
        "Klaida",
        "Jūs esate už WAL tinklelio ribų. Galite registruoti QSO tik būdami Lietuvoje."
      );
      return;
    }

    const result = qsoSchema.safeParse({
      receivedCallsign,
      receivedWAL,
      receivedRST,
      sentWAL: walCode ?? "",
      sentRST,
      frequency,
      mode,
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      Alert.alert("Validacijos klaida", firstError.message);
      return;
    }

    try {
      await drizzle.insert(qsos).values({
        userId,
        seasonId: activeSeason.id,
        ...result.data,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save QSO:", error);
      Alert.alert("Klaida", "Nepavyko išsaugoti QSO. Bandykite dar kartą.");
    }
  }, [
    isSignedIn,
    userId,
    activeSeason,
    userParticipatingInActiveSeason,
    isOutsideWALGrid,
    receivedCallsign,
    receivedWAL,
    receivedRST,
    walCode,
    sentRST,
    frequency,
    mode,
    drizzle,
    router,
  ]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <Button title="Save" onPress={handleSubmit} />,
      unstable_headerRightItems: () => [
        {
          type: "button",
          label: "Išsaugoti",
          variant: "prominent",
          icon: {
            name: "checkmark",
            type: "sfSymbol",
          },
          onPress: handleSubmit,
        },
      ],
    });
  }, [handleSubmit, navigation]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Permission request banner */}
      {!permissionResponse?.granted && (
        <Pressable
          style={({ pressed }) => [
            styles.permissionBanner,
            pressed && styles.permissionBannerPressed,
          ]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionTitle}>
            Įjungti buvimo vietos nustatymą
          </Text>
          <Text style={styles.permissionDescription}>
            Automatiškai nustatyti WAL pagal buvimo vietą
          </Text>
        </Pressable>
      )}

      {/* Outside WAL grid warning banner */}
      {isOutsideWALGrid && (
        <View style={styles.outsideGridBanner}>
          <Text style={styles.outsideGridTitle}>
            Esate už WAL tinklelio ribų
          </Text>
          <Text style={styles.outsideGridDescription}>
            QSO registruoti galima tik būnant Lietuvoje
          </Text>
        </View>
      )}

      <View style={[styles.card]}>
        <TextInput
          style={[styles.field]}
          placeholder="Šaukinys"
          placeholderTextColor={theme.colors.textSecondary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
          value={receivedCallsign}
          onChangeText={(text) => setReceivedCallsign(text.toUpperCase())}
          clearButtonMode="while-editing"
          editable={!isOutsideWALGrid}
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field]}
          placeholder="Gautas WAL"
          placeholderTextColor={theme.colors.textSecondary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
          value={receivedWAL}
          onChangeText={(text) => setReceivedWAL(text.toUpperCase())}
          clearButtonMode="while-editing"
          editable={!isOutsideWALGrid}
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field]}
          placeholder="Gautas RST"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={receivedRST}
          onChangeText={setReceivedRST}
          clearButtonMode="while-editing"
          editable={!isOutsideWALGrid}
        />
      </View>

      <View style={[styles.card]}>
        <View style={styles.labeledField}>
          <Text style={styles.fieldLabel}>Išsiųstas WAL</Text>
          {isLoadingLocation ? (
            <ActivityIndicator color={theme.colors.tint} />
          ) : (
            <Text style={styles.fieldValue}>{walCode || "—"}</Text>
          )}
        </View>
        <View style={styles.divider} />
        <TextInput
          style={[styles.field]}
          placeholder="Išsiųstas RST"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={sentRST}
          onChangeText={setSentRST}
          clearButtonMode="while-editing"
          editable={!isOutsideWALGrid}
        />
      </View>

      <View style={[styles.card]}>
        <TextInput
          style={[styles.field]}
          placeholder="Dažnis (MHz)"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={frequency}
          onChangeText={setFrequency}
          clearButtonMode="while-editing"
          editable={!isOutsideWALGrid}
        />
      </View>

      <SegmentedControl
        values={[...VALID_MODES]}
        onValueChange={(value) => setMode(value as (typeof VALID_MODES)[number])}
        selectedIndex={VALID_MODES.indexOf(mode)}
        enabled={!isOutsideWALGrid}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 50,
    gap: 35,
  },
  permissionBanner: {
    backgroundColor: theme.colors.tint,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: -20,
  },
  permissionBannerPressed: {
    opacity: 0.8,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
  },
  outsideGridBanner: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: -20,
  },
  outsideGridTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  outsideGridDescription: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
  },
  errorBanner: {
    backgroundColor: theme.colors.destructive,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: -20,
  },
  errorText: {
    fontSize: 14,
    color: "#ffffff",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },
  fieldContainer: {
    position: "relative",
  },
  field: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
  },
  fieldDisabled: {
    backgroundColor: theme.colors.separator,
    opacity: 0.6,
  },
  loadingIndicator: {
    position: "absolute",
    right: 16,
    top: 12,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.separator,
    marginLeft: 16,
    marginRight: 16,
  },
  labeledField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 17,
    color: theme.colors.text,
  },
  fieldValue: {
    fontSize: 17,
    color: theme.colors.textSecondary,
  },
}));
