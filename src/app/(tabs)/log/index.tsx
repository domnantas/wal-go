import { Text } from "@/components/Text";
import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import { ScrollView, StyleSheet } from "react-native";

export default function Log() {
  const { drizzle } = useSystem();
  const { data } = useQuery(toCompilableQuery(drizzle.query.qsos.findMany()));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      {data.map((qso) => (
        <Text key={qso.id} style={styles.text}>
          {qso.receivedCallsign} - {qso.mode}
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
