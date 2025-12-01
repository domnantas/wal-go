import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import { FlatList, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const MODE_COLORS: Record<string, string> = {
  SSB: "#007AFF",  // Blue
  CW: "#FF9500",   // Orange
  DIGI: "#34C759", // Green
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Log() {
  const { drizzle } = useSystem();
  const { data } = useQuery(toCompilableQuery(drizzle.query.qsos.findMany()));

  const sortedData = [...data].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <FlatList
      data={sortedData}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nėra QSO įrašų</Text>
          <Text style={styles.emptySubtext}>
            Pridėkite savo pirmą ryšį paspaudę + mygtuką
          </Text>
        </View>
      }
      renderItem={({ item: qso }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.callsign}>{qso.receivedCallsign}</Text>
            <View
              style={[
                styles.modeBadge,
                { backgroundColor: MODE_COLORS[qso.mode] ?? "#007AFF" },
              ]}
            >
              <Text style={styles.modeText}>{qso.mode}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Dažnis</Text>
              <Text style={styles.detailValue}>{qso.frequency} MHz</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>RST</Text>
              <Text style={styles.detailValue}>
                {qso.sentRST} / {qso.receivedRST}
              </Text>
            </View>
            {(qso.sentWAL || qso.receivedWAL) && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>WAL</Text>
                <Text style={styles.detailValue}>
                  {qso.sentWAL || "-"} / {qso.receivedWAL || "-"}
                </Text>
              </View>
            )}
          </View>

          {qso.createdAt && (
            <Text style={styles.date}>{formatDate(qso.createdAt)}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
  },
  separator: {
    height: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  callsign: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 12,
  },
  detail: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "500",
  },
  date: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
}));
