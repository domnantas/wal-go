import {
	calculateWal,
	isValidWalSquare,
	normalizeWalSquare,
} from "@WAL-GO/grid";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "wal-go:geolocation-square-enabled";

export type GeolocationPermission =
	| "denied"
	| "granted"
	| "prompt"
	| "unsupported";

function isGeolocationSupported() {
	return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function readEnabled() {
	if (typeof window === "undefined") {
		return false;
	}
	return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function writeEnabled(value: boolean) {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(STORAGE_KEY, String(value));
}

function squareFromCoords(latitude: number, longitude: number): null | string {
	const wal = normalizeWalSquare(calculateWal(latitude, longitude));
	return isValidWalSquare(wal) ? wal : null;
}

export function useGeolocationSquare(onSquare: (wal: string) => void) {
	const [enabled, setEnabled] = useState(readEnabled);
	const [permission, setPermission] = useState<GeolocationPermission>(() =>
		isGeolocationSupported() ? "prompt" : "unsupported"
	);
	const [isLocating, setIsLocating] = useState(false);

	const onSquareRef = useRef(onSquare);
	onSquareRef.current = onSquare;

	// Track the browser permission state so a previously denied user sees the
	// disabled button without having to click first.
	useEffect(() => {
		if (!(isGeolocationSupported() && navigator.permissions?.query)) {
			return;
		}
		let status: null | PermissionStatus = null;
		const handleChange = () => {
			if (status) {
				setPermission(status.state as GeolocationPermission);
			}
		};
		navigator.permissions
			.query({ name: "geolocation" })
			.then((permissionStatus) => {
				status = permissionStatus;
				setPermission(permissionStatus.state as GeolocationPermission);
				permissionStatus.addEventListener("change", handleChange);
			});
		return () => {
			status?.removeEventListener("change", handleChange);
		};
	}, []);

	const locate = useCallback(() => {
		if (!isGeolocationSupported()) {
			return;
		}
		setIsLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setIsLocating(false);
				setPermission("granted");
				const wal = squareFromCoords(
					position.coords.latitude,
					position.coords.longitude
				);
				if (wal) {
					onSquareRef.current(wal);
				}
			},
			(error) => {
				setIsLocating(false);
				if (error.code === error.PERMISSION_DENIED) {
					setPermission("denied");
					setEnabled(false);
					writeEnabled(false);
				}
			},
			{ enableHighAccuracy: true }
		);
	}, []);

	// The toggle is only truly active when the user both opted in (persisted) and
	// the browser still grants permission. A revoked/reset permission leaves the
	// stored flag on but reverts the toggle to off until the user re-grants.
	const isActive = enabled && permission === "granted";

	// Recalculate the square every time the dialog opens (mount) so a moved
	// operator gets their current square, not a stale one. Only auto-locate when
	// permission is granted, never silently re-prompt.
	const hasAutoLocated = useRef(false);
	useEffect(() => {
		if (hasAutoLocated.current) {
			return;
		}
		if (enabled && permission === "granted") {
			hasAutoLocated.current = true;
			locate();
		}
	}, [enabled, permission, locate]);

	const toggle = useCallback(() => {
		if (isActive) {
			setEnabled(false);
			writeEnabled(false);
			return;
		}
		setEnabled(true);
		writeEnabled(true);
		locate();
	}, [isActive, locate]);

	return { isActive, isLocating, permission, toggle };
}
