import Mapbox, { Camera, MapView, StyleImport } from "@rnmapbox/maps";
import { useUnistyles } from "react-native-unistyles";

Mapbox.setAccessToken(
  "pk.eyJ1IjoiZmlzdG1lbmFydXRvIiwiYSI6ImNqeXd6bmMxeTEybzMzbXJyZG9tMjVkemgifQ.5cwA9ergt7yRmWfNAIuDHw"
);

export default function Map() {
  const { theme } = useUnistyles();

  return (
    <MapView
      style={{ flex: 1 }}
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
    </MapView>
  );
}
