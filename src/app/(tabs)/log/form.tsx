import { Text } from "@/components/Text";
import { LogFeed, PartialQSO, QSO } from "@/lib/jazz/schema";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCoState } from "jazz-tools/expo";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function LogForm() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const fallbackIdRef = useRef<string | null>(null);
  const paramId = typeof id === "string" ? id : null;

  if (!paramId && !fallbackIdRef.current) {
    const draftQSO = PartialQSO.create({});
    fallbackIdRef.current = draftQSO.$jazz.id;
    router.replace(`/log/form?id=${draftQSO.$jazz.id}`);
  }

  const resolvedId = paramId ?? fallbackIdRef.current;
  const globalLog = useCoState(
    LogFeed,
    process.env.EXPO_PUBLIC_GLOBAL_LOG_FEED
  );
  const newQSO = useCoState(PartialQSO, resolvedId!);

  const handleSubmit = useCallback(() => {
    if (!newQSO.$isLoaded || !globalLog.$isLoaded) return;
    globalLog.$jazz.push(newQSO as QSO);
    router.back();
  }, [globalLog, newQSO, router]);

  useEffect(() => {
    if (!newQSO.$isLoaded) return;
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
  }, [handleSubmit, navigation, newQSO.$isLoaded]);

  if (!newQSO.$isLoaded) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text>Hello</Text>
      <Text>Hello</Text>
      <Text>Hello</Text>
      <Text>Hello</Text>
      <Text>Hello</Text>
      <Text>Hello</Text>

      {/* <View style={styles.card}>
        <TextInput
          style={[styles.field, styles.fieldTop]}
          placeholder="Received callsign"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={newQSO.receivedCallsign ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("receivedCallsign", text)}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={styles.field}
          placeholder="Received WAL"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={newQSO.receivedWAL ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("receivedWAL", text)}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Received RST (e.g. 599)"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={newQSO.receivedRST ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("receivedRST", text)}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={[styles.field, styles.fieldTop]}
          placeholder="Sent WAL"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={newQSO.sentWAL ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("sentWAL", text)}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Sent RST (e.g. 599)"
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          value={newQSO.sentRST ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("sentRST", text)}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.card}>
        <TextInput
          style={[styles.field, styles.fieldTop]}
          placeholder="Band (20m, 40m…)"
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          value={newQSO.band ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("band", text)}
          clearButtonMode="while-editing"
        />
        <View style={styles.divider} />
        <TextInput
          style={[styles.field, styles.fieldBottom]}
          placeholder="Mode (SSB, CW…)"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          value={newQSO.mode ?? ""}
          onChangeText={(text) => newQSO.$jazz.set("mode", text)}
          clearButtonMode="while-editing"
        />
      </View>

      {!globalLog.$isLoaded && (
        <Text style={styles.syncHint}>
          Syncing log… you can keep entering data.
        </Text>
      )} */}
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
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFEFF4",
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
  syncHint: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 13,
  },
});
