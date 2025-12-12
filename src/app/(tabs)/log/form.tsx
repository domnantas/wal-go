import { VALID_WAL, type WALCode } from "@/constants/wal";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { useSeasonParticipation } from "@/hooks/useSeasonParticipation";
import { qsos } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { qsoSchema, VALID_MODES } from "@/lib/validations/qso";
import { calculateWAL } from "@/lib/wal-grid";
import { Picker } from "@react-native-picker/picker";
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
  const [sentWAL, setSentWAL] = useState("");
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

  // Auto-fill sentWAL when walCode changes
  useEffect(() => {
    if (walCode) {
      setSentWAL(walCode);
    }
  }, [walCode]);

  // Determine if the sentWAL field should be editable
  const isSentWALEditable = !permissionResponse?.granted || !coordinates;

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
      sentWAL,
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
    sentWAL,
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

      <View style={styles.card}>
        <TextInput
          style={styles.field}
          placeholder="Šaukinys"
          placeholderTextColor={theme.colors.textSecondary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
          value={receivedCallsign}
          onChangeText={(text) => setReceivedCallsign(text.toUpperCase())}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Gautas WAL"
          placeholderTextColor={theme.colors.textSecondary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
          value={receivedWAL}
          onChangeText={(text) => setReceivedWAL(text.toUpperCase())}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Gautas RST"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={receivedRST}
          onChangeText={setReceivedRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.fieldContainer}>
          <TextInput
            style={[styles.field, !isSentWALEditable && styles.fieldDisabled]}
            placeholder={
              isLoadingLocation ? "Nustatoma buvimo vieta..." : "Išsiųstas WAL"
            }
            placeholderTextColor={theme.colors.textSecondary}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="characters"
            value={sentWAL}
            onChangeText={(text) => setSentWAL(text.toUpperCase())}
            clearButtonMode="while-editing"
            editable={isSentWALEditable}
          />
          {isLoadingLocation && (
            <ActivityIndicator
              style={styles.loadingIndicator}
              color={theme.colors.tint}
            />
          )}
        </View>
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Išsiųstas RST"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={sentRST}
          onChangeText={setSentRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.field}
          placeholder="Dažnis (MHz)"
          placeholderTextColor={theme.colors.textSecondary}
          inputMode="numeric"
          value={frequency}
          onChangeText={setFrequency}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <Picker
          selectedValue={mode}
          onValueChange={setMode}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="SSB" value="SSB" />
          <Picker.Item label="CW" value="CW" />
          <Picker.Item label="DIGI" value="DIGI" />
        </Picker>
      </View>
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
  },
  picker: {
    backgroundColor: theme.colors.card,
    height: 120,
  },
  pickerItem: {
    color: theme.colors.text,
    height: 120,
  },
}));
