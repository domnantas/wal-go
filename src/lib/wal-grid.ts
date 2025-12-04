import { bboxPolygon, center, getCoord } from "@turf/turf";

import { VALID_WAL, type WALCode } from "@/constants/wal";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const CELL_SIZE = 10 / 60;
const REFERENCE_LAT = 56 + 30 / 60;
const REFERENCE_LON = 20 + 50 / 60;
const MIN_LAT = 53 + 50 / 60;
const MAX_LAT = 56 + 20 / 60;
const MAX_LON = 27;

/**
 * Calculate WAL code from coordinates
 */
export function calculateWAL(latitude: number, longitude: number): string {
  const letter = LETTERS.charAt(
    Math.floor(-(latitude - REFERENCE_LAT) / CELL_SIZE)
  );
  const number = Math.floor((longitude - REFERENCE_LON) / CELL_SIZE);
  return `${letter}${number.toString().padStart(2, "0")}`;
}

/**
 * Generate GeoJSON FeatureCollection for all valid WAL grid polygons
 */
export function generateWALGridPolygons(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (
    let longitude = REFERENCE_LON;
    longitude < MAX_LON;
    longitude += CELL_SIZE
  ) {
    for (let latitude = MIN_LAT; latitude < MAX_LAT; latitude += CELL_SIZE) {
      const box = bboxPolygon([
        longitude,
        latitude,
        longitude + CELL_SIZE,
        latitude + CELL_SIZE,
      ]);

      const [centerLon, centerLat] = getCoord(center(box));
      const wal = calculateWAL(centerLat, centerLon);

      if (VALID_WAL.includes(wal as WALCode)) {
        features.push({
          type: "Feature",
          properties: {
            id: wal,
          },
          geometry: box.geometry,
        });
      }
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
