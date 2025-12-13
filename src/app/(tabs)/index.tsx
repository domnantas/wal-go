import { Team } from "@/constants/team";
import { qsos, seasonParticipants } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import Mapbox, {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
  StyleImport,
  SymbolLayer,
  UserTrackingMode,
} from "@rnmapbox/maps";
import { and, eq, isNotNull, ne, sql, sum } from "drizzle-orm";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { useActiveSeason } from "@/hooks/useActiveSeason";
import { generateWALGridPolygons } from "@/lib/wal-grid";

function getControllingTeam(y: number, g: number, r: number): Team | null {
  const max = Math.max(y, g, r);
  if (max === 0) return null;
  if (y === max && g < max && r < max) return "yellow";
  if (g === max && y < max && r < max) return "green";
  if (r === max && y < max && g < max) return "red";
  return null;
}

Mapbox.setAccessToken(
  "pk.eyJ1IjoiZmlzdG1lbmFydXRvIiwiYSI6ImNqeXd6bmMxeTEybzMzbXJyZG9tMjVkemgifQ.5cwA9ergt7yRmWfNAIuDHw"
);

export default function Map() {
  const { theme } = useUnistyles();
  const { drizzle } = useSystem();
  const { activeSeason } = useActiveSeason();
  const insets = useSafeAreaInsets();

  const { data: scores } = useQuery(
    toCompilableQuery(
      drizzle
        .select({
          sentWal: qsos.sentWAL,
          yellowScore: sum(
            sql`CASE WHEN ${seasonParticipants.team} = 'yellow' THEN 1 ELSE 0 END`
          ),
          greenScore: sum(
            sql`CASE WHEN ${seasonParticipants.team} = 'green' THEN 1 ELSE 0 END`
          ),
          redScore: sum(
            sql`CASE WHEN ${seasonParticipants.team} = 'red' THEN 1 ELSE 0 END`
          ),
        })
        .from(qsos)
        .innerJoin(
          seasonParticipants,
          and(
            eq(qsos.userId, seasonParticipants.userId),
            eq(qsos.seasonId, seasonParticipants.seasonId)
          )
        )
        .where(
          and(
            eq(qsos.seasonId, activeSeason?.id ?? ""),
            isNotNull(qsos.sentWAL),
            ne(qsos.sentWAL, "")
          )
        )
        .groupBy(qsos.sentWAL)
    )
  );

  const baseGridPolygons = useMemo(() => generateWALGridPolygons(), []);

  const scoreMap = useMemo(() => {
    const map: Record<string, (typeof scores)[number]> = {};
    for (const s of scores ?? []) {
      if (s.sentWal) map[s.sentWal] = s;
    }
    return map;
  }, [scores]);

  const gridPolygons = useMemo(() => {
    const features = baseGridPolygons.features.map((f) => {
      const walCode = f.properties?.id;
      const score = walCode ? scoreMap[walCode] : undefined;
      return {
        ...f,
        properties: {
          ...f.properties,
          yellowScore: Number(score?.yellowScore) || 0,
          greenScore: Number(score?.greenScore) || 0,
          redScore: Number(score?.redScore) || 0,
        },
      };
    });
    return { type: "FeatureCollection" as const, features };
  }, [baseGridPolygons, scoreMap]);

  const controlledSquares = useMemo(() => {
    const features = gridPolygons.features
      .map((f) => {
        const { yellowScore, greenScore, redScore } = f.properties;
        const team = getControllingTeam(yellowScore, greenScore, redScore);
        if (!team) return null;
        return { ...f, properties: { ...f.properties, team } };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return { type: "FeatureCollection" as const, features };
  }, [gridPolygons]);

  const teamTotals = useMemo(
    () =>
      controlledSquares.features.reduce(
        (acc, f) => ({
          ...acc,
          [f.properties.team]: acc[f.properties.team as Team] + 1,
        }),
        { yellow: 0, green: 0, red: 0 }
      ),
    [controlledSquares]
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        projection="globe"
        styleURL="mapbox://styles/mapbox/standard"
        gestureSettings={{ pitchEnabled: false }}
        scaleBarEnabled={false}
      >
        <StyleImport
          id="basemap"
          existing
          config={{ lightPreset: theme.mapLightPreset }}
        />
        <Camera
          followUserLocation={true}
          followUserMode={UserTrackingMode.Follow}
          followZoomLevel={8}
          zoomLevel={6}
          centerCoordinate={[23.8813, 55.1694]}
          maxBounds={{
            ne: [27.835556, 57.450278],
            sw: [19.970833, 52.896667],
          }}
        />
        <LocationPuck
          pulsing={"default"}
          puckBearing="heading"
          puckBearingEnabled
        />

        <ShapeSource id="controlled-squares" shape={controlledSquares}>
          <FillLayer
            id="controlled-fill"
            style={{
              fillColor: [
                "match",
                ["get", "team"],
                "yellow",
                theme.colors.teamYellow,
                "green",
                theme.colors.teamGreen,
                "red",
                theme.colors.teamRed,
                "transparent",
              ],
              fillOpacity: 0.5,
              fillEmissiveStrength: 0.8,
            }}
          />
        </ShapeSource>

        <ShapeSource id="wal-grid" shape={gridPolygons}>
          <LineLayer
            id="wal-grid-lines"
            style={{
              lineColor: theme.colors.tint,
              lineWidth: 1,
              lineOpacity: 0.4,
              lineEmissiveStrength: 0.6,
            }}
          />
          <SymbolLayer
            id="wal-grid-labels"
            style={{
              textField: ["get", "id"],
              textSize: ["interpolate", ["linear"], ["zoom"], 7, 10, 20, 250],
              textColor: theme.colors.tint,
              textOffset: [
                "interpolate",
                ["linear"],
                ["zoom"],
                8.9,
                [0, 0],
                9,
                [0, -0.5],
              ],
              textAllowOverlap: true,
            }}
          />
          <SymbolLayer
            id="wal-grid-scores"
            minZoomLevel={9}
            style={{
              textField: [
                "format",
                ["get", "yellowScore"],
                { "text-color": theme.colors.teamYellow },
                "\n",
                {},
                ["get", "greenScore"],
                { "text-color": theme.colors.teamGreen },
                "\n",
                {},
                ["get", "redScore"],
                { "text-color": theme.colors.teamRed },
              ],
              textSize: ["interpolate", ["linear"], ["zoom"], 8, 12, 20, 180],
              textOffset: [0, 2],
              textAllowOverlap: true,
            }}
          />
        </ShapeSource>
      </MapView>

      <View style={[styles.dashboardContainer, { top: insets.top + 20 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.dashboardCard,
            pressed && styles.dashboardCardPressed,
          ]}
        >
          <View style={[styles.teamScore, styles.teamScoreYellow]}>
            <Text style={styles.scoreValue}>{teamTotals.yellow}</Text>
          </View>
          <View style={[styles.teamScore, styles.teamScoreGreen]}>
            <Text style={styles.scoreValue}>{teamTotals.green}</Text>
          </View>
          <View style={[styles.teamScore, styles.teamScoreRed]}>
            <Text style={styles.scoreValue}>{teamTotals.red}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  dashboardContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  dashboardCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  dashboardCardPressed: {
    opacity: 0.8,
  },
  teamScore: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  teamScoreYellow: {
    backgroundColor: theme.colors.teamYellow,
  },
  teamScoreGreen: {
    backgroundColor: theme.colors.teamGreen,
  },
  teamScoreRed: {
    backgroundColor: theme.colors.teamRed,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
}));
