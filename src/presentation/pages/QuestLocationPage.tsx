import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type JSX
} from "react";
import { Link, useNavigate } from "react-router-dom";

import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import type { Location } from "@/core/entities/location.entity";
import { LocationMap } from "@/presentation/components/quest/LocationMap";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useGeolocation } from "@/presentation/hooks/useGeolocation";
import { useLocationValidation } from "@/presentation/hooks/useLocationValidation";
import { useQuestRuntime } from "@/presentation/hooks/useQuestRuntime";
import { useRoute } from "@/presentation/hooks/useRoute";
import { useRunSession } from "@/presentation/hooks/useRunSession";
import { ROUTES, toRouteLocationPath } from "@/shared/config/routes";
import { formatDistanceMeters } from "@/shared/utils/format-distance";
import { calculateHaversineDistanceMeters } from "@/shared/utils/haversine-distance";

function getNextLocationSlug(
  session: GameSessionSnapshot,
  locations: readonly Location[]
): string | null {
  const nextLocationId: string | undefined = session.nextLocation?.id;
  if (nextLocationId === undefined) {
    return null;
  }

  return (
    locations.find((location: Location): boolean => location.id === nextLocationId)?.slug ??
    null
  );
}

function mapValidationReason(reason: string): string {
  switch (reason) {
    case "outside_radius":
      return "You are outside the station radius. Retry GPS or use QR override.";
    case "incorrect_answer":
      return "Answer is incorrect. Please try again.";
    case "out_of_order":
      return "This station is not the expected next stop.";
    case "already_checked_in":
      return "Station already completed.";
    case "mismatch":
      return "Scanned QR does not match this station.";
    case "malformed":
      return "Invalid QR payload format.";
    case "run_not_active":
      return "Run is not active.";
    default:
      return "Validation failed.";
  }
}

function QuestLocationPage(): JSX.Element {
  const navigate = useNavigate();
  const routeSelection = useRoute();
  const { updateState, resetState } = useQuestRuntime();
  const geolocation = useGeolocation();
  const [answerText, setAnswerText] = useState<string>("");
  const [qrPayload, setQrPayload] = useState<string>("");
  const [isScannerVisible, setIsScannerVisible] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const runSession = useRunSession({
    routeSlug: routeSelection.routeSlug,
    locationSlug: routeSelection.locationSlug,
    enabled: routeSelection.isValid
  });

  useEffect((): void => {
    if (!routeSelection.isValid) {
      navigate(ROUTES.home);
    }
  }, [navigate, routeSelection.isValid]);

  useEffect((): void => {
    if (runSession.data === null) {
      return;
    }

    updateState({
      runId: runSession.data.run.id,
      locationId: runSession.data.requestedLocation.id
    });
  }, [runSession.data, updateState]);

  useEffect((): void => {
    if (runSession.errorContext === null) {
      return;
    }

    const activeRouteSlug = runSession.errorContext.activeRouteSlug;
    const activeNextLocationSlug = runSession.errorContext.activeNextLocationSlug;
    if (
      typeof activeRouteSlug === "string" &&
      typeof activeNextLocationSlug === "string"
    ) {
      navigate(toRouteLocationPath(activeRouteSlug, activeNextLocationSlug), {
        replace: true
      });
    }
  }, [navigate, runSession.errorContext]);

  useEffect((): (() => void) => {
    return (): void => {
      resetState();
    };
  }, [resetState]);

  const locationValidation = useLocationValidation({
    runId: runSession.data?.run.id ?? "",
    routeSlug: runSession.data?.route.slug ?? routeSelection.routeSlug,
    locationId: runSession.data?.requestedLocation.id ?? "",
    answerText,
    onSessionUpdated: (result): void => {
      if (result.accepted) {
        runSession.setSession(result.session);
      } else {
        if ("distanceMeters" in result && result.distanceMeters !== undefined) {
          updateState({
            detectedDistanceMeters: result.distanceMeters
          });
        }
      }
    }
  });

  useEffect((): void => {
    if (runSession.data === null) {
      return;
    }

    const nextLocationSlug: string | null = getNextLocationSlug(
      runSession.data.session,
      runSession.data.locations
    );

    if (
      nextLocationSlug !== null &&
      nextLocationSlug !== routeSelection.locationSlug &&
      !runSession.data.session.isCompleted
    ) {
      navigate(toRouteLocationPath(runSession.data.route.slug, nextLocationSlug), {
        replace: true
      });
    }
  }, [navigate, routeSelection.locationSlug, runSession.data]);

  const activeLocation = runSession.data?.requestedLocation ?? null;

  const computedDistanceFromTarget = useMemo((): number | null => {
    if (activeLocation === null || geolocation.snapshot === null) {
      return null;
    }

    return calculateHaversineDistanceMeters(
      geolocation.snapshot.position.latitude,
      geolocation.snapshot.position.longitude,
      activeLocation.position.latitude,
      activeLocation.position.longitude
    );
  }, [activeLocation, geolocation.snapshot]);

  const handleValidationSuccess = useCallback(
    (session: GameSessionSnapshot): void => {
      const nextLocationSlug: string | null =
        runSession.data === null
          ? null
          : getNextLocationSlug(session, runSession.data.locations);

      if (nextLocationSlug === null) {
        setFeedbackMessage("Route completed. Great run.");
        return;
      }

      if (runSession.data !== null) {
        navigate(toRouteLocationPath(runSession.data.route.slug, nextLocationSlug));
      }
    },
    [navigate, runSession.data]
  );

  const validateWithGps = useCallback(async (): Promise<void> => {
    if (runSession.data === null || answerText.trim().length === 0) {
      setFeedbackMessage("Please enter your station answer first.");
      return;
    }

    const geoSnapshot = await geolocation.requestCurrentPosition();
    if (geoSnapshot === null) {
      setFeedbackMessage(geolocation.errorMessage ?? "Unable to get GPS position.");
      return;
    }

    updateState({
      gpsLatitude: geoSnapshot.position.latitude,
      gpsLongitude: geoSnapshot.position.longitude
    });

    const response = await locationValidation.validateWithGps(geoSnapshot);
    if (response === null) {
      setFeedbackMessage(locationValidation.errorMessage ?? "GPS validation failed.");
      return;
    }

    if (response.accepted) {
      setFeedbackMessage("GPS check-in accepted.");
      handleValidationSuccess(response.session);
      return;
    }

    setFeedbackMessage(mapValidationReason(response.reason));
    updateState({
      detectedDistanceMeters: response.distanceMeters ?? null
    });
  }, [
    answerText,
    geolocation,
    handleValidationSuccess,
    locationValidation,
    updateState,
    runSession.data
  ]);

  const validateWithQr = useCallback(
    async (payload: string): Promise<void> => {
      if (runSession.data === null || answerText.trim().length === 0) {
        setFeedbackMessage("Please enter your station answer first.");
        return;
      }

      const response = await locationValidation.validateWithQr(payload);
      if (response === null) {
        setFeedbackMessage(locationValidation.errorMessage ?? "QR validation failed.");
        return;
      }

      if (response.accepted) {
        setFeedbackMessage("QR override accepted.");
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason));
    },
    [answerText, handleValidationSuccess, locationValidation, runSession.data]
  );

  if (runSession.isLoading || runSession.data === null || activeLocation === null) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <p className="quest-muted">Loading station session...</p>
          {runSession.errorMessage !== null ? (
            <p className="quest-error">{runSession.errorMessage}</p>
          ) : null}
          <Link className="app-link" to={ROUTES.home}>
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  const nextLocationSlug: string | null = getNextLocationSlug(
    runSession.data.session,
    runSession.data.locations
  );
  const progressRatio: string = `${runSession.data.session.completedLocations}/${runSession.data.session.totalLocations}`;

  return (
    <main className="quest-shell">
      <section className="quest-panel">
        <h1 className="quest-panel-title">{runSession.data.route.name}</h1>
        <p className="quest-muted">
          Progress: {progressRatio} ({runSession.data.session.completionPercentage}%)
        </p>
        <p className="quest-muted">
          Station {activeLocation.sequenceNumber}: {activeLocation.name}
        </p>
      </section>

      <section className="quest-panel">
        <LocationMap
          locations={runSession.data.locations}
          activeLocationId={activeLocation.id}
          userPosition={geolocation.snapshot?.position ?? null}
        />
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">Question</h2>
        <p className="quest-copy">{activeLocation.questionPrompt}</p>
        <label className="quest-field">
          <span className="quest-field-label">Your answer</span>
          <input
            className="quest-input"
            value={answerText}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setAnswerText(event.target.value);
            }}
            maxLength={300}
          />
        </label>

        <div className="quest-actions">
          <button
            className="quest-button"
            type="button"
            disabled={locationValidation.isSubmitting || geolocation.isLoading}
            onClick={(): void => {
              void validateWithGps();
            }}
          >
            {geolocation.isLoading ? "Reading GPS..." : "Validate with GPS"}
          </button>
          <button
            className="quest-button quest-button--ghost"
            type="button"
            disabled={locationValidation.isSubmitting}
            onClick={(): void => {
              setIsScannerVisible((isVisible: boolean): boolean => !isVisible);
            }}
          >
            {isScannerVisible ? "Hide QR Scanner" : "Scan QR Override"}
          </button>
        </div>

        <QrScannerPanel
          isActive={isScannerVisible}
          onDetected={(payload: string): void => {
            setQrPayload(payload);
            setIsScannerVisible(false);
            void validateWithQr(payload);
          }}
          onError={(message: string): void => {
            setFeedbackMessage(message);
          }}
        />

        <label className="quest-field">
          <span className="quest-field-label">Or paste QR payload</span>
          <input
            className="quest-input"
            value={qrPayload}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setQrPayload(event.target.value);
            }}
            placeholder="Paste scanned payload"
          />
        </label>
        <button
          className="quest-button quest-button--ghost"
          type="button"
          disabled={locationValidation.isSubmitting}
          onClick={(): void => {
            void validateWithQr(qrPayload);
          }}
        >
          Validate QR payload
        </button>

        {computedDistanceFromTarget !== null ? (
          <p className="quest-muted">
            Current distance to station: {formatDistanceMeters(computedDistanceFromTarget)}
          </p>
        ) : null}
        {feedbackMessage !== null ? (
          <p className="quest-feedback" role="status">
            {feedbackMessage}
          </p>
        ) : null}
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">Next step</h2>
        <p className="quest-copy">
          {nextLocationSlug === null
            ? "You are at the final checkpoint."
            : `Expected next stop slug: ${nextLocationSlug}`}
        </p>
        <Link className="app-link" to={ROUTES.home}>
          Exit to home
        </Link>
      </section>
    </main>
  );
}

export default QuestLocationPage;
