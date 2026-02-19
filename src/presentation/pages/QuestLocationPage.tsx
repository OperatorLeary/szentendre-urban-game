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
import { useLanguage } from "@/presentation/app/LanguageContext";
import { LocationMap } from "@/presentation/components/quest/LocationMap";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useGeolocation } from "@/presentation/hooks/useGeolocation";
import { useLocationValidation } from "@/presentation/hooks/useLocationValidation";
import { useQuestRuntime } from "@/presentation/hooks/useQuestRuntime";
import { useRoute } from "@/presentation/hooks/useRoute";
import { useRunSession } from "@/presentation/hooks/useRunSession";
import type { TranslationKey } from "@/presentation/i18n/translations";
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

function mapValidationReason(
  reason: string,
  translate: (key: TranslationKey) => string
): string {
  switch (reason) {
    case "outside_radius":
      return translate("quest.reason.outside_radius");
    case "incorrect_answer":
      return translate("quest.reason.incorrect_answer");
    case "out_of_order":
      return translate("quest.reason.out_of_order");
    case "already_checked_in":
      return translate("quest.reason.already_checked_in");
    case "mismatch":
      return translate("quest.reason.mismatch");
    case "malformed":
      return translate("quest.reason.malformed");
    case "run_not_active":
      return translate("quest.reason.run_not_active");
    default:
      return translate("quest.reason.default");
  }
}

function QuestLocationPage(): JSX.Element {
  const { t } = useLanguage();
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
        setFeedbackMessage(t("quest.routeCompleted"));
        return;
      }

      if (runSession.data !== null) {
        navigate(toRouteLocationPath(runSession.data.route.slug, nextLocationSlug));
      }
    },
    [navigate, runSession.data, t]
  );

  const validateWithGps = useCallback(async (): Promise<void> => {
    if (runSession.data === null || answerText.trim().length === 0) {
      setFeedbackMessage(t("quest.answerRequired"));
      return;
    }

    const geoSnapshot = await geolocation.requestCurrentPosition();
    if (geoSnapshot === null) {
      setFeedbackMessage(geolocation.errorMessage ?? t("quest.unableGetGpsPosition"));
      return;
    }

    updateState({
      gpsLatitude: geoSnapshot.position.latitude,
      gpsLongitude: geoSnapshot.position.longitude
    });

    const response = await locationValidation.validateWithGps(geoSnapshot);
    if (response === null) {
      setFeedbackMessage(locationValidation.errorMessage ?? t("quest.gpsValidationFailed"));
      return;
    }

    if (response.accepted) {
      setFeedbackMessage(t("quest.gpsAccepted"));
      handleValidationSuccess(response.session);
      return;
    }

    setFeedbackMessage(mapValidationReason(response.reason, t));
    updateState({
      detectedDistanceMeters: response.distanceMeters ?? null
    });
  }, [
    answerText,
    geolocation,
    handleValidationSuccess,
    locationValidation,
    updateState,
    runSession.data,
    t
  ]);

  const validateWithQr = useCallback(
    async (payload: string): Promise<void> => {
      if (runSession.data === null || answerText.trim().length === 0) {
        setFeedbackMessage(t("quest.answerRequired"));
        return;
      }

      const response = await locationValidation.validateWithQr(payload);
      if (response === null) {
        setFeedbackMessage(locationValidation.errorMessage ?? t("quest.qrValidationFailed"));
        return;
      }

      if (response.accepted) {
        setFeedbackMessage(t("quest.qrAccepted"));
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason, t));
    },
    [answerText, handleValidationSuccess, locationValidation, runSession.data, t]
  );

  if (runSession.isLoading || runSession.data === null || activeLocation === null) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <p className="quest-muted">{t("quest.loadingSession")}</p>
          {runSession.errorMessage !== null ? (
            <p className="quest-error">{runSession.errorMessage}</p>
          ) : null}
          <Link className="app-link" to={ROUTES.home}>
            {t("quest.backHome")}
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
          {t("quest.progress")}: {progressRatio} ({runSession.data.session.completionPercentage}
          %)
        </p>
        <p className="quest-muted">
          {t("quest.station")} {activeLocation.sequenceNumber}: {activeLocation.name}
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
        <h2 className="quest-panel-title">{t("quest.questionTitle")}</h2>
        <p className="quest-copy">{activeLocation.questionPrompt}</p>
        <label className="quest-field">
          <span className="quest-field-label">{t("quest.yourAnswerLabel")}</span>
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
            {geolocation.isLoading ? t("quest.readingGps") : t("quest.validateWithGps")}
          </button>
          <button
            className="quest-button quest-button--ghost"
            type="button"
            disabled={locationValidation.isSubmitting}
            onClick={(): void => {
              setIsScannerVisible((isVisible: boolean): boolean => !isVisible);
            }}
          >
            {isScannerVisible ? t("quest.hideQrScanner") : t("quest.scanQrOverride")}
          </button>
        </div>

        <QrScannerPanel
          isActive={isScannerVisible}
          onClose={(): void => {
            setIsScannerVisible(false);
          }}
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
          <span className="quest-field-label">{t("quest.orPasteQrPayloadLabel")}</span>
          <input
            className="quest-input"
            value={qrPayload}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setQrPayload(event.target.value);
            }}
            placeholder={t("quest.pasteScannedPayloadPlaceholder")}
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
          {t("quest.validateQrPayload")}
        </button>

        {computedDistanceFromTarget !== null ? (
          <p className="quest-muted">
            {t("quest.currentDistance")}: {formatDistanceMeters(computedDistanceFromTarget)}
          </p>
        ) : null}
        {feedbackMessage !== null ? (
          <p className="quest-feedback" role="status">
            {feedbackMessage}
          </p>
        ) : null}
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("quest.nextStepTitle")}</h2>
        <p className="quest-copy">
          {nextLocationSlug === null
            ? t("quest.finalCheckpoint")
            : t("quest.expectedNextStop", { slug: nextLocationSlug })}
        </p>
        <Link className="app-link" to={ROUTES.home}>
          {t("quest.exitHome")}
        </Link>
      </section>
    </main>
  );
}

export default QuestLocationPage;
