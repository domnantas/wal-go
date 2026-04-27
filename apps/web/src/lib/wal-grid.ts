import {
	calculateWal,
	createValidWalSet,
	WAL_GRID_END_LATITUDE,
	WAL_GRID_END_LONGITUDE,
	WAL_GRID_START_LATITUDE,
	WAL_GRID_START_LONGITUDE,
	WAL_GRID_STEP_DEGREES,
} from "@WAL-GO/grid";

type Position = [number, number];

interface WalGridFeature {
	geometry: {
		type: "Polygon";
		coordinates: Position[][];
	};
	properties: {
		wal: string;
	};
	type: "Feature";
}

export interface WalGridFeatureCollection {
	features: WalGridFeature[];
	type: "FeatureCollection";
}

function createWalFeature(
	west: number,
	south: number,
	east: number,
	north: number,
	wal: string
): WalGridFeature {
	return {
		type: "Feature",
		properties: { wal },
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[west, south],
					[east, south],
					[east, north],
					[west, north],
					[west, south],
				],
			],
		},
	};
}

export function createWalGridFeatureCollection(): WalGridFeatureCollection {
	const features: WalGridFeature[] = [];
	const validWal = createValidWalSet();

	for (
		let longitude = WAL_GRID_START_LONGITUDE;
		longitude < WAL_GRID_END_LONGITUDE;
		longitude += WAL_GRID_STEP_DEGREES
	) {
		for (
			let latitude = WAL_GRID_START_LATITUDE;
			latitude < WAL_GRID_END_LATITUDE;
			latitude += WAL_GRID_STEP_DEGREES
		) {
			const east = longitude + WAL_GRID_STEP_DEGREES;
			const north = latitude + WAL_GRID_STEP_DEGREES;
			const wal = calculateWal(
				latitude + WAL_GRID_STEP_DEGREES / 2,
				longitude + WAL_GRID_STEP_DEGREES / 2
			);

			if (validWal.has(wal)) {
				features.push(createWalFeature(longitude, latitude, east, north, wal));
			}
		}
	}

	return {
		type: "FeatureCollection",
		features,
	};
}
