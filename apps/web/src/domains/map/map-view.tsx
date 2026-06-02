import {
	calculateWal,
	isValidWalSquare,
	normalizeWalSquare,
} from "@WAL-GO/grid";
import { useEffect, useRef, useState } from "react";
import { createWalGridFeatureCollection } from "@/lib/wal-grid";
import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibre-theme.css";
import { useQuery } from "@tanstack/react-query";
import type { StyleSpecification } from "maplibre-gl";
import { useTheme } from "tanstack-theme-kit";
import darkStyle from "@/assets/walgo-dark-style.json";
import lightStyle from "@/assets/walgo-style.json";
import { orpc } from "@/utils/orpc";

const LITHUANIA_CENTER: [number, number] = [23.88, 55.17];
// Country extent used to frame the map. The initial zoom and minZoom are
// derived from fitting these bounds to the container, so the whole country
// stays visible on any viewport (narrow mobile included) instead of relying
// on hardcoded per-breakpoint zoom values.
const LITHUANIA_BOUNDS: [[number, number], [number, number]] = [
	[20.9, 53.89],
	[26.87, 56.45],
];
const FIT_PADDING = 24;
const WAL_GRID_SOURCE_ID = "wal-grid";
const WAL_GRID_FILL_LAYER_ID = "wal-grid-fill";
const WAL_GRID_LINE_LAYER_ID = "wal-grid-lines";
const WAL_GRID_SELECTED_LINE_LAYER_ID = "wal-grid-selected-line";
const WAL_GRID_LABEL_LAYER_ID = "wal-grid-labels";
const WAL_GRID_GEOJSON = createWalGridFeatureCollection();
const CLICKABLE_WAL_GRID_LAYER_IDS = [
	WAL_GRID_FILL_LAYER_ID,
	WAL_GRID_LINE_LAYER_ID,
	WAL_GRID_LABEL_LAYER_ID,
] as const;

type Team = "yellow" | "green" | "red";
type SquareControl = Team | "tie" | null;

type SquaresData = Array<{
	code: string;
	scores: { yellow: number; green: number; red: number };
}>;

interface WalGridTheme {
	labelColor: string;
	labelHaloColor: string;
	lineColor: string;
	selectedLineColor: string;
	teamFillColors: Record<Team, string>;
	tieFillColor: string;
}

// Precomputed RGB equivalents of design system oklch tokens:
// light: --brand-bark oklch(0.45 0.08 55), --brand-cream oklch(0.97 0.008 90)
// dark:  --foreground oklch(0.93 0.015 80), --background oklch(0.22 0.025 55)
// Team fills: --brand-golden, --brand-olive, --brand-rust (light/dark variants)
const WAL_GRID_THEMES: Record<"dark" | "light", WalGridTheme> = {
	dark: {
		labelColor: "rgb(237 231 221)",
		labelHaloColor: "rgb(36 23 15)",
		lineColor: "rgb(237 231 221)",
		selectedLineColor: "rgb(255 255 255)",
		tieFillColor: "rgb(121 121 121)",
		teamFillColors: {
			yellow: "rgb(224, 188, 72)",
			green: "rgb(106, 165, 82)",
			red: "rgb(204, 122, 68)",
		},
	},
	light: {
		labelColor: "rgb(119 72 38)",
		labelHaloColor: "rgb(247 245 240)",
		lineColor: "rgb(119 72 38)",
		selectedLineColor: "rgb(36 23 15)",
		tieFillColor: "rgb(148 148 148)",
		teamFillColors: {
			yellow: "rgb(224, 175, 59)",
			green: "rgb(44, 88, 46)",
			red: "rgb(163, 72, 22)",
		},
	},
};

function computeControllingTeam(scores: {
	yellow: number;
	green: number;
	red: number;
}): SquareControl {
	const teams: Team[] = ["yellow", "green", "red"];
	const max = Math.max(...teams.map((t) => scores[t]));
	if (max === 0) {
		return null;
	}
	const leaders = teams.filter((t) => scores[t] === max);
	return leaders.length === 1 ? leaders[0] : "tie";
}

function createEnrichedGeoJSON(squaresData: SquaresData) {
	const controlMap = new Map<string, SquareControl>();
	for (const sq of squaresData) {
		controlMap.set(sq.code, computeControllingTeam(sq.scores));
	}

	return {
		...WAL_GRID_GEOJSON,
		features: WAL_GRID_GEOJSON.features.map((feature) => ({
			...feature,
			properties: {
				...feature.properties,
				controllingTeam: controlMap.get(feature.properties.wal) ?? null,
			},
		})),
	};
}

function updateSourceWithTeamData(
	map: import("maplibre-gl").Map,
	squaresData: SquaresData
) {
	const source = map.getSource(WAL_GRID_SOURCE_ID);
	if (!source || source.type !== "geojson") {
		return;
	}
	(source as import("maplibre-gl").GeoJSONSource).setData(
		createEnrichedGeoJSON(squaresData) as Parameters<
			import("maplibre-gl").GeoJSONSource["setData"]
		>[0]
	);
}

function updateSelectedSquareFilter(
	map: import("maplibre-gl").Map,
	selectedSquareCode: string | null
) {
	if (!map.getLayer(WAL_GRID_SELECTED_LINE_LAYER_ID)) {
		return;
	}

	map.setFilter(
		WAL_GRID_SELECTED_LINE_LAYER_ID,
		selectedSquareCode ? ["==", ["get", "wal"], selectedSquareCode] : false
	);
}

function squareFromCoords(latitude: number, longitude: number): null | string {
	const wal = normalizeWalSquare(calculateWal(latitude, longitude));
	return isValidWalSquare(wal) ? wal : null;
}

function getClickableWalGridLayerIds(map: import("maplibre-gl").Map) {
	return CLICKABLE_WAL_GRID_LAYER_IDS.filter((layerId) =>
		map.getLayer(layerId)
	);
}

// Lock minZoom to the zoom that fits the whole country in the current
// container. `reframe` also recenters/zooms the camera (used on first load);
// on resize we only tighten minZoom so the user's current view is preserved.
function fitLithuaniaBounds(map: import("maplibre-gl").Map, reframe: boolean) {
	const camera = map.cameraForBounds(LITHUANIA_BOUNDS, {
		padding: FIT_PADDING,
	});
	if (!camera || typeof camera.zoom !== "number") {
		return;
	}
	map.setMinZoom(camera.zoom);
	if (reframe) {
		map.jumpTo(camera);
	}
}

interface MapViewProps {
	onSquareSelect(selectedSquareCode: string | null): void;
	seasonId: number | null;
	selectedSquareCode: string | null;
}

export function MapView({
	onSquareSelect,
	seasonId,
	selectedSquareCode,
}: MapViewProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<import("maplibre-gl").Map | null>(null);
	const onSquareSelectRef = useRef(onSquareSelect);
	const selectedSquareCodeRef = useRef(selectedSquareCode);
	const [currentSquare, setCurrentSquare] = useState<string | null>(null);
	const { theme, systemTheme } = useTheme();

	const { data: squaresData } = useQuery(
		orpc.scoring.squares.queryOptions({
			input: { seasonId: seasonId ?? undefined },
		})
	);

	const squaresDataRef = useRef(squaresData);
	useEffect(() => {
		squaresDataRef.current = squaresData;
	}, [squaresData]);

	useEffect(() => {
		onSquareSelectRef.current = onSquareSelect;
	}, [onSquareSelect]);

	useEffect(() => {
		selectedSquareCodeRef.current = selectedSquareCode;
	}, [selectedSquareCode]);

	const effectiveTheme = theme === "system" ? systemTheme : theme;
	const isDark = effectiveTheme === "dark";

	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		const style = isDark ? darkStyle : lightStyle;
		const walGridTheme = isDark ? WAL_GRID_THEMES.dark : WAL_GRID_THEMES.light;

		const handleStyleLoad = () => {
			addWalGridLayers(map, walGridTheme);
			updateSelectedSquareFilter(map, selectedSquareCodeRef.current);
			const data = squaresDataRef.current;
			if (data) {
				updateSourceWithTeamData(map, data);
			}
		};

		map.once("style.load", handleStyleLoad);
		map.setStyle(style as StyleSpecification);

		return () => {
			map.off("style.load", handleStyleLoad);
		};
	}, [isDark]);

	useEffect(() => {
		const map = mapRef.current;
		if (!(map && squaresData)) {
			return;
		}
		updateSourceWithTeamData(map, squaresData);
	}, [squaresData]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map) {
			return;
		}
		updateSelectedSquareFilter(map, selectedSquareCode);
	}, [selectedSquareCode]);

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
				maxBounds: [
					[19, 52.896_667],
					[29, 57.450_278],
				],
			});

			mapRef.current = map;

			// Frame the whole country and derive minZoom from the fit, so it adapts
			// to the viewport. Re-tighten minZoom on resize (e.g. device rotation).
			fitLithuaniaBounds(map, true);
			map.on("resize", () => fitLithuaniaBounds(map, false));

			map.addControl(
				new maplibregl.NavigationControl({ visualizePitch: true }),
				"top-right"
			);
			const geolocateControl = new maplibregl.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true,
				},
				showAccuracyCircle: true,
				showUserLocation: true,
				trackUserLocation: true,
				fitBoundsOptions: {
					maxZoom: 9,
				},
			});
			map.addControl(geolocateControl, "top-right");

			geolocateControl.on("geolocate", (event) => {
				const position = event as GeolocationPosition;
				setCurrentSquare(
					squareFromCoords(position.coords.latitude, position.coords.longitude)
				);
			});
			geolocateControl.on("error", () => setCurrentSquare(null));
			map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

			map.on("style.load", () => {
				addWalGridLayers(map, walGridTheme);
				updateSelectedSquareFilter(map, selectedSquareCodeRef.current);
				const data = squaresDataRef.current;
				if (data) {
					updateSourceWithTeamData(map, data);
				}
			});

			map.on("click", (event) => {
				const layers = getClickableWalGridLayerIds(map);
				if (layers.length === 0) {
					onSquareSelectRef.current(null);
					return;
				}

				const features = map.queryRenderedFeatures(event.point, {
					layers,
				});
				const squareCode = features.find(
					(feature) => typeof feature.properties?.wal === "string"
				)?.properties?.wal;

				if (typeof squareCode === "string") {
					onSquareSelectRef.current(squareCode);
					return;
				}

				onSquareSelectRef.current(null);
			});

			map.on("mousemove", (event) => {
				const layers = getClickableWalGridLayerIds(map);
				if (layers.length === 0) {
					map.getCanvas().style.cursor = "";
					return;
				}

				const features = map.queryRenderedFeatures(event.point, {
					layers,
				});
				map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
			});

			map.on("mouseleave", () => {
				map.getCanvas().style.cursor = "";
			});
		}

		initializeMap();

		return () => {
			isMounted = false;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);

	return (
		<div className="relative flex-1" ref={mapContainerRef}>
			{currentSquare ? (
				<div className="pointer-events-none absolute top-2 right-12 z-10 rounded-md border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur">
					<div className="text-muted-foreground text-xs">Jūsų kvadratas</div>
					<div className="font-semibold text-foreground text-lg tabular-nums">
						{currentSquare}
					</div>
				</div>
			) : null}
		</div>
	);
}

function addWalGridLayers(map: import("maplibre-gl").Map, theme: WalGridTheme) {
	if (!map.getSource(WAL_GRID_SOURCE_ID)) {
		map.addSource(WAL_GRID_SOURCE_ID, {
			type: "geojson",
			data: WAL_GRID_GEOJSON,
		});
	}

	const fillColorExpression = [
		"match",
		["get", "controllingTeam"],
		"yellow",
		theme.teamFillColors.yellow,
		"green",
		theme.teamFillColors.green,
		"red",
		theme.teamFillColors.red,
		"tie",
		theme.tieFillColor,
		"transparent",
	] as unknown as import("maplibre-gl").ExpressionSpecification;

	if (map.getLayer(WAL_GRID_FILL_LAYER_ID)) {
		map.setPaintProperty(
			WAL_GRID_FILL_LAYER_ID,
			"fill-color",
			fillColorExpression
		);
		map.setPaintProperty(WAL_GRID_FILL_LAYER_ID, "fill-opacity", 0.4);
	} else {
		map.addLayer({
			id: WAL_GRID_FILL_LAYER_ID,
			type: "fill",
			source: WAL_GRID_SOURCE_ID,
			paint: {
				"fill-color": fillColorExpression,
				"fill-opacity": 0.4,
			},
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

	if (map.getLayer(WAL_GRID_SELECTED_LINE_LAYER_ID)) {
		map.setPaintProperty(
			WAL_GRID_SELECTED_LINE_LAYER_ID,
			"line-color",
			theme.selectedLineColor
		);
	} else {
		map.addLayer({
			id: WAL_GRID_SELECTED_LINE_LAYER_ID,
			type: "line",
			source: WAL_GRID_SOURCE_ID,
			filter: false,
			paint: {
				"line-color": theme.selectedLineColor,
				"line-opacity": 1,
				"line-width": 2,
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
				"text-size": ["interpolate", ["linear"], ["zoom"], 5, 1, 7, 10, 10, 30],
			},
			paint: {
				"text-color": theme.labelColor,
				"text-halo-color": theme.labelHaloColor,
				"text-halo-width": 1.4,
			},
		});
	}
}
