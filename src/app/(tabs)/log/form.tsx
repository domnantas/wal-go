import { useAuth } from "@/hooks/useAuth";
import { qsos } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function LogForm() {
  const navigation = useNavigation();
  const router = useRouter();
  const { drizzle } = useSystem();
  const { session } = useAuth();

  const [receivedCallsign, setReceivedCallsign] = useState("");
  const [receivedWAL, setReceivedWAL] = useState("");
  const [receivedRST, setReceivedRST] = useState("59");
  const [sentWAL, setSentWAL] = useState("");
  const [sentRST, setSentRST] = useState("59");
  const [frequency, setFrequency] = useState("");
  const [mode, setMode] = useState("SSB");

  const handleSubmit = useCallback(async () => {
    if (!session?.user.id) {
      Alert.alert("Error", "You must be logged in to add a QSO.");
      return;
    }

    if (!receivedCallsign) {
      Alert.alert("Error", "Received callsign is required.");
      return;
    }

    try {
      await drizzle.insert(qsos).values({
        userId: session.user.id,
        receivedCallsign,
        receivedWAL,
        receivedRST,
        sentWAL,
        sentRST,
        frequency,
        mode,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save QSO:", error);
      Alert.alert("Error", "Failed to save QSO. Please try again.");
    }
  }, [
    drizzle,
    session?.user.id,
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
          style={[styles.field, styles.fieldTop]}
          placeholder="Received callsign"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={receivedCallsign}
          onChangeText={setReceivedCallsign}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Received WAL"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={receivedWAL}
          onChangeText={setReceivedWAL}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Received RST (e.g. 59)"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={receivedRST}
          onChangeText={setReceivedRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={[styles.field, styles.fieldTop]}
          placeholder="Sent WAL"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={sentWAL}
          onChangeText={setSentWAL}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Sent RST (e.g. 59)"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={sentRST}
          onChangeText={setSentRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={[styles.field, styles.fieldTop]}
          placeholder="Frequency (MHz)"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={frequency}
          onChangeText={setFrequency}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Mode (SSB, CW…)"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={mode}
          onChangeText={setMode}
          clearButtonMode="while-editing"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DADADA",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  field: {
    fontSize: 17,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  fieldTop: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  fieldBottom: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 18,
  },
});
