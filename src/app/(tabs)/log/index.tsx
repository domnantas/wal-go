import { Text } from "@/components/Text";
import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import { ScrollView, StyleSheet } from "react-native";

export default function Log() {
  const {drizzle} = useSystem()
  const {data} = useQuery(toCompilableQuery(drizzle.query.qsos.findMany()))

  console.log(data)
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
