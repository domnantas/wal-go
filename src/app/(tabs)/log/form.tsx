import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { qsos } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const colors = useColors();

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

  const dynamicStyles = useMemo(
    () => ({
      scroll: {
        flex: 1,
        backgroundColor: colors.background,
      },
      card: {
        backgroundColor: colors.card,
        borderRadius: 10,
        overflow: "hidden" as const,
      },
      field: {
        fontSize: 17,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        color: colors.text,
      },
      divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.separator,
        marginLeft: 16,
      },
    }),
    [colors]
  );

  return (
    <ScrollView
      style={dynamicStyles.scroll}
      contentContainerStyle={styles.content}
    >
      <View style={dynamicStyles.card}>
        <TextInput
          style={dynamicStyles.field}
          placeholder="Šaukinys"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          value={receivedCallsign}
          onChangeText={setReceivedCallsign}
          clearButtonMode="while-editing"
        />
        <View style={dynamicStyles.divider} />
        <TextInput
          style={dynamicStyles.field}
          placeholder="Gautas WAL"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          value={receivedWAL}
          onChangeText={setReceivedWAL}
          clearButtonMode="while-editing"
        />
        <View style={dynamicStyles.divider} />
        <TextInput
          style={dynamicStyles.field}
          placeholder="Gautas RST"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={receivedRST}
          onChangeText={setReceivedRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={dynamicStyles.card}>
        <TextInput
          style={dynamicStyles.field}
          placeholder="Išsiųstas WAL"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          value={sentWAL}
          onChangeText={setSentWAL}
          clearButtonMode="while-editing"
        />
        <View style={dynamicStyles.divider} />
        <TextInput
          style={dynamicStyles.field}
          placeholder="Išsiųstas RST"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={sentRST}
          onChangeText={setSentRST}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={dynamicStyles.card}>
        <TextInput
          style={dynamicStyles.field}
          placeholder="Dažnis (MHz)"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={frequency}
          onChangeText={setFrequency}
          clearButtonMode="while-editing"
        />
        <View style={dynamicStyles.divider} />
        <TextInput
          style={dynamicStyles.field}
          placeholder="Mode (SSB, CW...)"
          placeholderTextColor={colors.textSecondary}
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 35,
  },
});
