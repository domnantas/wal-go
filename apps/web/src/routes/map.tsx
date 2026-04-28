import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { createWalGridFeatureCollection } from "@/lib/wal-grid";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import {
	differenceInSeconds,
	format,
	formatDistanceToNowStrict,
} from "date-fns";
import { lt } from "date-fns/locale";
import type { StyleSpecification } from "maplibre-gl";
import { useTheme } from "tanstack-theme-kit";
import darkStyle from "@/assets/liberty-dark-style.json";
import lightStyle from "@/assets/liberty-style.json";
import { orpc } from "@/utils/orpc";

const LITHUANIA_CENTER: [number, number] = [23.88, 55.17];
const WAL_GRID_SOURCE_ID = "wal-grid";
const WAL_GRID_LINE_LAYER_ID = "wal-grid-lines";
const WAL_GRID_LABEL_LAYER_ID = "wal-grid-labels";
const WAL_GRID_GEOJSON = createWalGridFeatureCollection();

export const Route = createFileRoute("/map")({
	beforeLoad({ context }) {
		if (!context.session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
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

	return (
		<main className="relative flex min-h-0 overflow-hidden">
			<div className="relative flex-1" ref={mapContainerRef} />
			<aside className="w-70 shrink-0 overflow-y-auto border-border border-l bg-card">
				<SeasonProgressBox />
			</aside>
		</main>
	);
}

function SeasonProgressBox() {
	const { data: season } = useQuery(orpc.seasons.current.queryOptions());

	if (!season) {
		return null;
	}

	const now = new Date();
	const totalLengthSeconds = differenceInSeconds(
		season.endsAt,
		season.startsAt
	);
	const elapsedSeconds = differenceInSeconds(now, season.startsAt);
	const percentageTimeLeft = Math.min(
		100,
		Math.max(0, (elapsedSeconds / totalLengthSeconds) * 100)
	);

	console.log(season.endsAt);
	const timeLeft = formatDistanceToNowStrict(season.endsAt, {
		locale: lt,
	});

	return (
		<div className="border-border border-b px-5 py-4.5">
			<p className="mb-2.5 font-bold text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
				Sezonas
			</p>
			<p className="mb-0.5 font-bold font-serif text-[18px] text-foreground">
				{season.name}
			</p>
			<p className="mb-3 text-[11px] text-muted-foreground/70">
				{format(season.startsAt, "yyyy-MM-dd")} →{" "}
				{format(season.endsAt, "yyyy-MM-dd")}
			</p>
			<div className="mb-1.5 h-1.75 overflow-hidden rounded-lg bg-muted">
				<div
					className="h-full rounded-lg bg-accent transition-[width] duration-500"
					style={{ width: `${percentageTimeLeft}%` }}
				/>
			</div>
			<div className="flex justify-between text-[11px] text-muted-foreground/70">
				<span>{Math.round(percentageTimeLeft)}% baigta</span>
				<span>Liko {timeLeft}</span>
			</div>
		</div>
	);
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
