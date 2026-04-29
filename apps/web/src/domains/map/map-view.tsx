import { useEffect, useRef } from "react";
import { createWalGridFeatureCollection } from "@/lib/wal-grid";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StyleSpecification } from "maplibre-gl";
import { useTheme } from "tanstack-theme-kit";
import darkStyle from "@/assets/liberty-dark-style.json";
import lightStyle from "@/assets/liberty-style.json";

const LITHUANIA_CENTER: [number, number] = [23.88, 55.17];
const WAL_GRID_SOURCE_ID = "wal-grid";
const WAL_GRID_LINE_LAYER_ID = "wal-grid-lines";
const WAL_GRID_LABEL_LAYER_ID = "wal-grid-labels";
const WAL_GRID_GEOJSON = createWalGridFeatureCollection();

export function MapView() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<import("maplibre-gl").Map | null>(null);
	const { theme, systemTheme } = useTheme();

	const effectiveTheme = theme === "system" ? systemTheme : theme;

	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		const style = effectiveTheme === "dark" ? darkStyle : lightStyle;
		map.setStyle(style as StyleSpecification);
		map.once("style.load", () => addWalGridLayers(map));
	}, [effectiveTheme]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial style captured at mount only
	useEffect(() => {
		let isMounted = true;
		const initialStyle = effectiveTheme === "dark" ? darkStyle : lightStyle;
		async function initializeMap() {
			const maplibregl = await import("maplibre-gl");
			if (!(isMounted && mapContainerRef.current)) {
				return;
			}

			const map = new maplibregl.Map({
				attributionControl: { compact: true },
				center: LITHUANIA_CENTER,
				container: mapContainerRef.current,
				style: initialStyle as StyleSpecification,
				zoom: 7,
				minZoom: 7,
				maxBounds: [
					[19, 52.896_667],
					[29, 57.450_278],
				],
			});

			mapRef.current = map;

			map.addControl(
				new maplibregl.NavigationControl({ visualizePitch: true }),
				"top-right"
			);
			map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

			map.on("style.load", () => addWalGridLayers(map));
		}

		initializeMap();

		return () => {
			isMounted = false;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);

	return <div className="relative flex-1" ref={mapContainerRef} />;
}

function addWalGridLayers(map: import("maplibre-gl").Map) {
	if (!map.getSource(WAL_GRID_SOURCE_ID)) {
		map.addSource(WAL_GRID_SOURCE_ID, {
			type: "geojson",
			data: WAL_GRID_GEOJSON,
		});
	}

	if (!map.getLayer(WAL_GRID_LINE_LAYER_ID)) {
		map.addLayer({
			id: WAL_GRID_LINE_LAYER_ID,
			type: "line",
			source: WAL_GRID_SOURCE_ID,
			paint: {
				"line-color": "#000",
				"line-opacity": 0.85,
				"line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 10, 1.4],
			},
		});
	}

	if (!map.getLayer(WAL_GRID_LABEL_LAYER_ID)) {
		map.addLayer({
			id: WAL_GRID_LABEL_LAYER_ID,
			type: "symbol",
			source: WAL_GRID_SOURCE_ID,
			layout: {
				"text-allow-overlap": true,
				"text-field": ["get", "wal"],
				"text-size": ["interpolate", ["linear"], ["zoom"], 6, 9, 10, 14],
			},
			paint: {
				"text-color": "#fff",
				"text-halo-color": "#000",
				"text-halo-width": 1.4,
			},
		});
	}
}
