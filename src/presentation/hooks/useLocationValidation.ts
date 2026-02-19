import { useCallback, useState } from "react";

import type {
  ValidateGpsCheckinResponse
} from "@/application/use-cases/validate-gps-checkin.use-case";
import type {
  ValidateQrCheckinResponse
} from "@/application/use-cases/validate-qr-checkin.use-case";
import {
  toCheckinId,
  toLocationId,
  toRunId
} from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import type { GeolocationSnapshot } from "@/presentation/hooks/useGeolocation";

function generateIdentifier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface UseLocationValidationInput {
  readonly runId: string;
  readonly routeSlug: string;
  readonly locationId: string;
  readonly answerText: string;
  readonly onSessionUpdated: (
    session: ValidateGpsCheckinResponse | ValidateQrCheckinResponse
  ) => void;
}

interface UseLocationValidationResult {
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly lastResult:
    | ValidateGpsCheckinResponse
    | ValidateQrCheckinResponse
    | null;
  validateWithGps: (
    geolocation: GeolocationSnapshot
  ) => Promise<ValidateGpsCheckinResponse | null>;
  validateWithQr: (
    scannedPayload: string
  ) => Promise<ValidateQrCheckinResponse | null>;
}

export function useLocationValidation(
  input: UseLocationValidationInput
): UseLocationValidationResult {
  const { gameUseCases } = useAppServices();
  const { answerText, locationId, onSessionUpdated, routeSlug, runId } = input;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<
    ValidateGpsCheckinResponse | ValidateQrCheckinResponse | null
  >(null);

  const validateWithGps = useCallback(
    async (
      geolocation: GeolocationSnapshot
    ): Promise<ValidateGpsCheckinResponse | null> => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const response: ValidateGpsCheckinResponse =
          await gameUseCases.validateGpsCheckin({
            checkinId: toCheckinId(generateIdentifier()),
            runId: toRunId(runId),
            locationId: toLocationId(locationId),
            answerText,
            currentPosition: new GeoPoint({
              latitude: geolocation.position.latitude,
              longitude: geolocation.position.longitude
            }),
            horizontalAccuracyMeters: geolocation.accuracyMeters
          });

        setLastResult(response);
        onSessionUpdated(response);
        return response;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "GPS validation failed."
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [answerText, gameUseCases, locationId, onSessionUpdated, runId]
  );

  const validateWithQr = useCallback(
    async (scannedPayload: string): Promise<ValidateQrCheckinResponse | null> => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const response: ValidateQrCheckinResponse =
          await gameUseCases.validateQrCheckin({
            checkinId: toCheckinId(generateIdentifier()),
            runId: toRunId(runId),
            locationId: toLocationId(locationId),
            expectedRouteSlug: routeSlug,
            answerText,
            scannedPayload
          });

        setLastResult(response);
        onSessionUpdated(response);
        return response;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "QR validation failed."
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [answerText, gameUseCases, locationId, onSessionUpdated, routeSlug, runId]
  );

  return {
    isSubmitting,
    errorMessage,
    lastResult,
    validateWithGps,
    validateWithQr
  };
}
