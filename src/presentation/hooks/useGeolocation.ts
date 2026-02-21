import { useCallback, useEffect, useMemo, useState } from "react";

export interface GeolocationPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface GeolocationSnapshot {
  readonly position: GeolocationPoint;
  readonly accuracyMeters: number;
  readonly timestamp: number;
}

interface GeolocationState {
  readonly snapshot: GeolocationSnapshot | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
}

const INITIAL_STATE: GeolocationState = {
  snapshot: null,
  isLoading: false,
  errorMessage: null
};

interface UseGeolocationResult {
  readonly snapshot: GeolocationSnapshot | null;
  readonly snapshotAgeMilliseconds: number | null;
  readonly isSnapshotStale: boolean;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  requestCurrentPosition: () => Promise<GeolocationSnapshot | null>;
}

const GPS_SNAPSHOT_STALE_THRESHOLD_MS = 45_000;

export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE);
  const [clockTick, setClockTick] = useState<number>(Date.now());

  const requestCurrentPosition = useCallback(
    async (): Promise<GeolocationSnapshot | null> => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setState((previousState: GeolocationState): GeolocationState => ({
          ...previousState,
          isLoading: false,
          errorMessage: "Geolocation is not supported by this browser."
        }));
        return null;
      }

      setState((previousState: GeolocationState): GeolocationState => ({
        ...previousState,
        isLoading: true,
        errorMessage: null
      }));

      return new Promise<GeolocationSnapshot | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition): void => {
            const snapshot: GeolocationSnapshot = {
              position: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              },
              accuracyMeters: position.coords.accuracy,
              timestamp: position.timestamp
            };

            setState({
              snapshot,
              isLoading: false,
              errorMessage: null
            });
            setClockTick(Date.now());
            resolve(snapshot);
          },
          (error: GeolocationPositionError): void => {
            setState((previousState: GeolocationState): GeolocationState => ({
              ...previousState,
              isLoading: false,
              errorMessage: error.message
            }));
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15_000,
            maximumAge: 0
          }
        );
      });
    },
    []
  );

  useEffect(() => {
    if (state.snapshot === null || typeof window === "undefined") {
      return;
    }

    const intervalId = window.setInterval((): void => {
      setClockTick(Date.now());
    }, 1_000);

    return (): void => {
      window.clearInterval(intervalId);
    };
  }, [state.snapshot]);

  const snapshotAgeMilliseconds = useMemo((): number | null => {
    if (state.snapshot === null) {
      return null;
    }

    return Math.max(0, clockTick - state.snapshot.timestamp);
  }, [clockTick, state.snapshot]);

  const isSnapshotStale: boolean =
    snapshotAgeMilliseconds !== null &&
    snapshotAgeMilliseconds > GPS_SNAPSHOT_STALE_THRESHOLD_MS;

  return {
    snapshot: state.snapshot,
    snapshotAgeMilliseconds,
    isSnapshotStale,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    requestCurrentPosition
  };
}
