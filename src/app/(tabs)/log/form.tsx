import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { qsos } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { qsoSchema, VALID_MODES } from "@/lib/validations/qso";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, ScrollView, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function LogForm() {
  const navigation = useNavigation();
  const router = useRouter();
  const { drizzle } = useSystem();
  const { session } = useAuth();
  const { activeSeason } = useActiveSeason();
  const { theme } = useUnistyles();

  const [receivedCallsign, setReceivedCallsign] = useState("");
  const [receivedWAL, setReceivedWAL] = useState("");
  const [receivedRST, setReceivedRST] = useState("");
  const [sentWAL, setSentWAL] = useState("");
  const [sentRST, setSentRST] = useState("");
  const [frequency, setFrequency] = useState("");
  const [mode, setMode] = useState<(typeof VALID_MODES)[number]>("SSB");

  const handleSubmit = useCallback(async () => {
    if (!session?.user.id) {
      Alert.alert("Klaida", "Turite būti prisijungę, kad pridėtumėte QSO.");
      return;
    }

    if (!activeSeason) {
      Alert.alert("Klaida", "Šiuo metu nėra aktyvaus sezono.");
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
        userId: session.user.id,
        seasonId: activeSeason.id,
        ...result.data,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save QSO:", error);
      Alert.alert("Klaida", "Nepavyko išsaugoti QSO. Bandykite dar kartą.");
    }
  }, [
    drizzle,
    session?.user.id,
    activeSeason,
    receivedCallsign,
    receivedWAL,
    receivedRST,
    sentWAL,
    sentRST,
    frequency,
    mode,
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
      <View style={styles.card}>
        <TextInput
          style={styles.field}
          placeholder="Šaukinys"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="characters"
          value={receivedCallsign}
          onChangeText={setReceivedCallsign}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Gautas WAL"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="characters"
          value={receivedWAL}
          onChangeText={setReceivedWAL}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Gautas RST"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
          value={receivedRST}
          onChangeText={setReceivedRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.field}
          placeholder="Išsiųstas WAL"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="characters"
          value={sentWAL}
          onChangeText={setSentWAL}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Išsiųstas RST"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
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
          keyboardType="numeric"
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
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },
  field: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
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
