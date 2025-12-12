import {
  getForegroundPermissionsAsync,
  LocationObject,
  LocationPermissionResponse,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
} from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

interface LocationState {
  permissionResponse: LocationPermissionResponse | null;
  coordinates: { latitude: number; longitude: number } | null;
  requestPermission: () => Promise<void>;
}

export function useLocation(): LocationState {
  const [permissionResponse, setPermissionResponse] =
    useState<LocationPermissionResponse | null>(null);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const checkPermission = useCallback(async () => {
    const permissionResponse = await getForegroundPermissionsAsync();
    setPermissionResponse(permissionResponse);
  }, []);

  const requestPermission = useCallback(async () => {
    const permissionResponse = await requestForegroundPermissionsAsync();
    setPermissionResponse(permissionResponse);
  }, []);

  // Check permission on mount and when app returns to foreground
  useEffect(() => {
    checkPermission();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }, [checkPermission]);

  // Watch position when permission is granted
  useEffect(() => {
    if (!permissionResponse?.granted) {
      setCoordinates(null);
      return;
    }

    let subscription: { remove: () => void } | null = null;

    const startWatching = async () => {
      subscription = await watchPositionAsync(
        { distanceInterval: 10 },
        (location: LocationObject) => {
          setCoordinates({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    };

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, [permissionResponse?.granted]);

  return { permissionResponse, coordinates, requestPermission };
}
