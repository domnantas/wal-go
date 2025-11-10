import { Text } from "@/components/Text";
import { LogFeed } from "@/lib/jazz/schema";
import { useCoState } from "jazz-tools/expo";
import { ScrollView, StyleSheet } from "react-native";

export default function Log() {
  const logFeed = useCoState(LogFeed, process.env.EXPO_PUBLIC_GLOBAL_LOG_FEED);

  if (!logFeed.$isLoaded) return null;

  const logs = Object.values(logFeed.perAccount).flatMap((accountFeed) =>
    Array.from(accountFeed.all)
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      {/* {logs.map((entry) => {
          if (!entry.value.$isLoaded) return null;
          return (
            <Text key={entry.value.$jazz.id} style={styles.text}>
              {entry.value.receivedCallsign}
            </Text>
          );
        })} */}
      {Array.from({ length: 40 }, (_, index) => (
        <Text key={index} style={styles.text}>
          TEST {index + 1}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 32,
  },
});
