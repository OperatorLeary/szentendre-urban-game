import { useCallback, useState } from "react";

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
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  requestCurrentPosition: () => Promise<GeolocationSnapshot | null>;
}

export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE);

  const requestCurrentPosition = useCallback(
    async (): Promise<GeolocationSnapshot | null> => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setState({
          snapshot: null,
          isLoading: false,
          errorMessage: "Geolocation is not supported by this browser."
        });
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
            resolve(snapshot);
          },
          (error: GeolocationPositionError): void => {
            setState({
              snapshot: null,
              isLoading: false,
              errorMessage: error.message
            });
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

  return {
    snapshot: state.snapshot,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    requestCurrentPosition
  };
}
