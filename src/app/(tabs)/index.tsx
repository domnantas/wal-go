import Mapbox, {
  Camera,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
  StyleImport,
  SymbolLayer,
  UserTrackingMode,
} from "@rnmapbox/maps";
import { useMemo } from "react";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { generateWALGridPolygons } from "@/lib/wal-grid";

Mapbox.setAccessToken(
  "pk.eyJ1IjoiZmlzdG1lbmFydXRvIiwiYSI6ImNqeXd6bmMxeTEybzMzbXJyZG9tMjVkemgifQ.5cwA9ergt7yRmWfNAIuDHw"
);

export default function Map() {
  const { theme } = useUnistyles();

  const gridPolygons = useMemo(() => generateWALGridPolygons(), []);

  return (
    <MapView
      style={styles.map}
      projection="globe"
      styleURL="mapbox://styles/mapbox/standard"
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

      <ShapeSource id="wal-grid" shape={gridPolygons}>
        <LineLayer
          id="wal-grid-lines"
          style={{
            lineColor: theme.colors.tint,
            lineWidth: 1,
            lineOpacity: 0.5,
          }}
        />
        <SymbolLayer
          id="wal-grid-labels"
          style={{
            textField: ["get", "id"],
            textSize: ["interpolate", ["linear"], ["zoom"], 7, 10, 20, 250],
            textColor: theme.colors.tint,
            textAllowOverlap: true,
          }}
        />
      </ShapeSource>
    </MapView>
  );
}

const styles = StyleSheet.create(() => ({
  map: {
    flex: 1,
  },
}));
