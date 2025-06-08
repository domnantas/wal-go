import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

export default function Map() {
  const mapRef = useRef<mapboxgl.Map | undefined>(undefined);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiZmlzdG1lbmFydXRvIiwiYSI6ImNqeXd6bmMxeTEybzMzbXJyZG9tMjVkemgifQ.5cwA9ergt7yRmWfNAIuDHw";

    if (!mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [23.8813, 55.1694],
      maxBounds: [
        [19.970833, 52.896667],
        [27.835556, 57.450278],
      ],
      pitchWithRotate: false,
      touchPitch: false,
      dragRotate: false,
    });

    return () => {
      mapRef.current?.remove();
    };
  }, []);
  return (
    <>
      <div
        id="map"
        style={{ flex: 1, width: "100%", height: "100%" }}
        ref={mapContainerRef}
      />
    </>
  );
}
