import Mapbox, {
  Camera,
  LineLayer,
  MapView,
  ShapeSource,
  StyleImport,
  SymbolLayer,
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
        zoomLevel={6}
        centerCoordinate={[23.8813, 55.1694]}
        maxBounds={{
          ne: [27.835556, 57.450278],
          sw: [19.970833, 52.896667],
        }}
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
            textSize: ["interpolate", ["linear"], ["zoom"], 7, 13, 20, 250],
            textColor: theme.colors.tint,
            textHaloColor: theme.colors.background,
            textHaloWidth: 1,
            textAllowOverlap: true,
          }}
          minZoomLevel={7}
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
