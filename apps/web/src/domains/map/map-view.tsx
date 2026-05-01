import { useEffect, useRef } from "react";
import { createWalGridFeatureCollection } from "@/lib/wal-grid";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StyleSpecification } from "maplibre-gl";
import { useTheme } from "tanstack-theme-kit";
import darkStyle from "@/assets/walgo-dark-style.json";
import lightStyle from "@/assets/walgo-style.json";

const LITHUANIA_CENTER: [number, number] = [23.88, 55.17];
const WAL_GRID_SOURCE_ID = "wal-grid";
const WAL_GRID_LINE_LAYER_ID = "wal-grid-lines";
const WAL_GRID_LABEL_LAYER_ID = "wal-grid-labels";
const WAL_GRID_GEOJSON = createWalGridFeatureCollection();

interface WalGridTheme {
	labelColor: string;
	labelHaloColor: string;
	lineColor: string;
}

// Precomputed RGB equivalents of design system oklch tokens:
// light: --brand-bark oklch(0.45 0.08 55), --brand-cream oklch(0.97 0.008 90)
// dark:  --foreground oklch(0.93 0.015 80), --background oklch(0.22 0.025 55)
const WAL_GRID_THEMES: Record<"dark" | "light", WalGridTheme> = {
	dark: {
		labelColor: "rgb(237 231 221)",
		labelHaloColor: "rgb(36 23 15)",
		lineColor: "rgb(237 231 221)",
	},
	light: {
		labelColor: "rgb(119 72 38)",
		labelHaloColor: "rgb(247 245 240)",
		lineColor: "rgb(119 72 38)",
	},
};

export function MapView() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<import("maplibre-gl").Map | null>(null);
	const { theme, systemTheme } = useTheme();

	const effectiveTheme = theme === "system" ? systemTheme : theme;
	const isDark = effectiveTheme === "dark";

	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		const style = isDark ? darkStyle : lightStyle;
		const walGridTheme = isDark ? WAL_GRID_THEMES.dark : WAL_GRID_THEMES.light;

		map.once("style.load", () => addWalGridLayers(map, walGridTheme));
		map.setStyle(style as StyleSpecification);

		return () => {
			map.off("style.load", () => addWalGridLayers(map, walGridTheme));
		};
	}, [isDark]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial style captured at mount only
	useEffect(() => {
		let isMounted = true;
		const initialStyle = isDark ? darkStyle : lightStyle;
		const walGridTheme = isDark ? WAL_GRID_THEMES.dark : WAL_GRID_THEMES.light;

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

			map.on("style.load", () => addWalGridLayers(map, walGridTheme));
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

function addWalGridLayers(map: import("maplibre-gl").Map, theme: WalGridTheme) {
	if (!map.getSource(WAL_GRID_SOURCE_ID)) {
		map.addSource(WAL_GRID_SOURCE_ID, {
			type: "geojson",
			data: WAL_GRID_GEOJSON,
		});
	}

	if (map.getLayer(WAL_GRID_LINE_LAYER_ID)) {
		map.setPaintProperty(WAL_GRID_LINE_LAYER_ID, "line-color", theme.lineColor);
	} else {
		map.addLayer({
			id: WAL_GRID_LINE_LAYER_ID,
			type: "line",
			source: WAL_GRID_SOURCE_ID,
			paint: {
				"line-color": theme.lineColor,
				"line-opacity": 0.85,
				"line-width": 1,
			},
		});
	}

	if (map.getLayer(WAL_GRID_LABEL_LAYER_ID)) {
		map.setPaintProperty(
			WAL_GRID_LABEL_LAYER_ID,
			"text-color",
			theme.labelColor
		);
		map.setPaintProperty(
			WAL_GRID_LABEL_LAYER_ID,
			"text-halo-color",
			theme.labelHaloColor
		);
	} else {
		map.addLayer({
			id: WAL_GRID_LABEL_LAYER_ID,
			type: "symbol",
			source: WAL_GRID_SOURCE_ID,
			layout: {
				"text-allow-overlap": true,
				"text-field": ["get", "wal"],
				"text-size": ["interpolate", ["linear"], ["zoom"], 7, 14, 10, 30],
				// "text-size": 14,
			},
			paint: {
				"text-color": theme.labelColor,
				"text-halo-color": theme.labelHaloColor,
				"text-halo-width": 1.4,
			},
		});
	}
}
