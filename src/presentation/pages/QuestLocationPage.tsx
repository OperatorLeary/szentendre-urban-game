import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type JSX
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import type { Location } from "@/core/entities/location.entity";
import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { AbandonRunDialog } from "@/presentation/components/quest/AbandonRunDialog";
import { LocationMap } from "@/presentation/components/quest/LocationMap";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useGeolocation } from "@/presentation/hooks/useGeolocation";
import { useLocationValidation } from "@/presentation/hooks/useLocationValidation";
import { useQuestRuntime } from "@/presentation/hooks/useQuestRuntime";
import { useRoute } from "@/presentation/hooks/useRoute";
import { useRunControl } from "@/presentation/hooks/useRunControl";
import { useRunSession } from "@/presentation/hooks/useRunSession";
import type { AppLanguage } from "@/presentation/i18n/language.types";
import { localizeRouteName } from "@/presentation/i18n/localize-route";
import type { TranslationKey } from "@/presentation/i18n/translations";
import { ROUTES, toRouteLocationPath } from "@/shared/config/routes";
import { formatDistanceMeters } from "@/shared/utils/format-distance";
import { calculateHaversineDistanceMeters } from "@/shared/utils/haversine-distance";

type NavigationMode = "text" | "map";

const NAVIGATION_MODE_STORAGE_KEY = "szentendre-city-quest-navigation-mode";

function resolveInitialNavigationMode(): NavigationMode {
  if (typeof window === "undefined") {
    return "text";
  }

  const storedValue: string | null = window.localStorage.getItem(
    NAVIGATION_MODE_STORAGE_KEY
  );
  return storedValue === "map" ? "map" : "text";
}

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

function resolveLocalizedStationText(
  language: AppLanguage,
  hungarianText: string | null,
  defaultText: string | null
): string | null {
  if (language === "hu") {
    return hungarianText ?? defaultText;
  }

  return defaultText ?? hungarianText;
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
  const { language, t } = useLanguage();
  const { play } = useSound();
  const navigate = useNavigate();
  const location = useLocation();
  const routeSelection = useRoute();
  const { updateState, resetState } = useQuestRuntime();
  const geolocation = useGeolocation();
  const [answerText, setAnswerText] = useState<string>("");
  const [qrPayload, setQrPayload] = useState<string>("");
  const [isScannerVisible, setIsScannerVisible] = useState<boolean>(false);
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(
    resolveInitialNavigationMode
  );
  const runControl = useRunControl();

  const preferRequestedStart = useMemo((): boolean => {
    const params = new URLSearchParams(location.search);
    return params.get("entry") === "qr";
  }, [location.search]);

  const runSession = useRunSession({
    routeSlug: routeSelection.routeSlug,
    locationSlug: routeSelection.locationSlug,
    enabled: routeSelection.isValid,
    preferRequestedStart
  });

  useEffect((): void => {
    if (!routeSelection.isValid) {
      void navigate(ROUTES.home);
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
      void navigate(toRouteLocationPath(activeRouteSlug, activeNextLocationSlug), {
        replace: true
      });
    }
  }, [navigate, runSession.errorContext]);

  useEffect((): (() => void) => {
    return (): void => {
      resetState();
    };
  }, [resetState]);

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NAVIGATION_MODE_STORAGE_KEY, navigationMode);
  }, [navigationMode]);

  const locationValidation = useLocationValidation({
    runId: runSession.data?.run.id ?? "",
    routeSlug: runSession.data?.route.slug ?? routeSelection.routeSlug,
    locationId: runSession.data?.requestedLocation.id ?? "",
    answerText,
    onSessionUpdated: (result): void => {
      if (result.accepted) {
        runSession.setSession(result.session);
      } else {
        if ("distanceMeters" in result) {
          updateState({
            detectedDistanceMeters: result.distanceMeters ?? null
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
      void navigate(toRouteLocationPath(runSession.data.route.slug, nextLocationSlug), {
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
      play("success");
      return;
    }

      if (runSession.data !== null) {
        void navigate(toRouteLocationPath(runSession.data.route.slug, nextLocationSlug));
      }
    },
    [navigate, play, runSession.data, t]
  );

  const validateWithGps = useCallback(async (): Promise<void> => {
    if (runSession.data === null || answerText.trim().length === 0) {
      setFeedbackMessage(t("quest.answerRequired"));
      return;
    }

    const geoSnapshot = await geolocation.requestCurrentPosition();
    if (geoSnapshot === null) {
      setFeedbackMessage(geolocation.errorMessage ?? t("quest.unableGetGpsPosition"));
      play("error");
      return;
    }

    updateState({
      gpsLatitude: geoSnapshot.position.latitude,
      gpsLongitude: geoSnapshot.position.longitude
    });

    const response = await locationValidation.validateWithGps(geoSnapshot);
    if (response === null) {
      setFeedbackMessage(locationValidation.errorMessage ?? t("quest.gpsValidationFailed"));
      play("error");
      return;
    }

    if (response.accepted) {
      setFeedbackMessage(t("quest.gpsAccepted"));
      play("success");
      handleValidationSuccess(response.session);
      return;
    }

    setFeedbackMessage(mapValidationReason(response.reason, t));
    play("error");
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
    t,
    play
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
        play("error");
        return;
      }

      if (response.accepted) {
        setFeedbackMessage(t("quest.qrAccepted"));
        play("success");
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason, t));
      play("error");
    },
    [answerText, handleValidationSuccess, locationValidation, runSession.data, t, play]
  );

  const handleConfirmAbandon = useCallback(async (): Promise<void> => {
    const isSuccess: boolean = await runControl.abandonActiveRun();
    if (!isSuccess) {
      play("error");
      return;
    }

    setIsAbandonDialogOpen(false);
    setFeedbackMessage(t("quest.abandonSuccess"));
    play("success");
    void navigate(ROUTES.home, { replace: true });
  }, [navigate, play, runControl, t]);

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
  const localizedRouteTitle: string = localizeRouteName(
    runSession.data.route.slug,
    runSession.data.route.name,
    t
  );
  const localizedQuestionPrompt: string =
    language === "hu" && activeLocation.questionPromptHu !== null
      ? activeLocation.questionPromptHu
      : activeLocation.questionPrompt;
  const fallbackNavigationTextHint: string = t("quest.navigationTextHint", {
    stationName: activeLocation.name,
    stationSequence: String(activeLocation.sequenceNumber)
  });
  const localizedInstructionBrief: string =
    resolveLocalizedStationText(
      language,
      activeLocation.instructionBriefHu,
      activeLocation.instructionBrief
    ) ?? fallbackNavigationTextHint;
  const localizedInstructionFull: string | null = resolveLocalizedStationText(
    language,
    activeLocation.instructionFullHu,
    activeLocation.instructionFull
  );
  const progressRatio: string = `${String(runSession.data.session.completedLocations)}/${String(runSession.data.session.totalLocations)}`;
  const progressPercentage: number = runSession.data.session.completionPercentage;
  const hasAnswer: boolean = answerText.trim().length > 0;
  const hasQrPayload: boolean = qrPayload.trim().length > 0;
  const nextLocationName: string | null = runSession.data.session.nextLocation?.name ?? null;

  return (
    <main className="quest-shell">
      <section className="quest-panel">
        <div className="quest-panel-header">
          <h1 className="quest-panel-title">{localizedRouteTitle}</h1>
          <button
            className="quest-button quest-button--danger"
            type="button"
            onClick={(): void => {
              play("tap");
              runControl.resetAbandonError();
              setIsAbandonDialogOpen(true);
            }}
          >
            {t("quest.abandonJourney")}
          </button>
        </div>
        <p className="quest-muted">
          {t("quest.progress")}: {progressRatio} ({progressPercentage}%)
        </p>
        <div
          className="quest-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercentage}
          aria-label={t("quest.progress")}
        >
          <div
            className="quest-progress-fill"
            style={{ width: `${String(progressPercentage)}%` }}
          />
        </div>
        <p className="quest-muted">
          {t("quest.station")} {activeLocation.sequenceNumber}: {activeLocation.name}
        </p>
      </section>

      <section className="quest-panel">
        <div className="quest-navigation-header">
          <h2 className="quest-panel-title">{t("quest.navigationTitle")}</h2>
        <div
          className="quest-navigation-toggle"
          role="group"
          aria-label={t("quest.navigationTitle")}
          >
            <button
              className={`theme-switcher-button ${
                navigationMode === "text" ? "theme-switcher-button--active" : ""
              }`}
              type="button"
              onClick={(): void => {
                play("tap");
                setNavigationMode("text");
              }}
            >
              {t("quest.navigationTextMode")}
            </button>
            <button
              className={`theme-switcher-button ${
                navigationMode === "map" ? "theme-switcher-button--active" : ""
              }`}
              type="button"
              onClick={(): void => {
                play("tap");
                setNavigationMode("map");
              }}
            >
              {t("quest.navigationMapMode")}
            </button>
          </div>
        </div>
        <p className="quest-copy quest-instruction-brief">{localizedInstructionBrief}</p>
        {localizedInstructionFull !== null ? (
          <details className="quest-instruction-details">
            <summary>{t("quest.navigationDetailsToggle")}</summary>
            <p className="quest-copy quest-instruction-full">{localizedInstructionFull}</p>
          </details>
        ) : (
          <p className="quest-muted">{t("quest.navigationDetailsMissing")}</p>
        )}
        {navigationMode === "map" ? (
          <LocationMap
            locations={runSession.data.locations}
            activeLocationId={activeLocation.id}
            userPosition={geolocation.snapshot?.position ?? null}
          />
        ) : (
          <p className="quest-muted">{t("quest.navigationTextOnlyHint")}</p>
        )}
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("quest.questionTitle")}</h2>
        <p className="quest-copy">{localizedQuestionPrompt}</p>
        <label className="quest-field">
          <span className="quest-field-label">{t("quest.yourAnswerLabel")}</span>
          <input
            className="quest-input"
            value={answerText}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setAnswerText(event.target.value);
            }}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>): void => {
              if (event.key !== "Enter" || !hasAnswer || locationValidation.isSubmitting) {
                return;
              }

              event.preventDefault();
              play("tap");
              void validateWithGps();
            }}
            maxLength={300}
          />
        </label>
        <p className="quest-muted quest-answer-hint">{t("quest.answerQuickHint")}</p>

        <div className="quest-actions">
          <button
            className="quest-button"
            type="button"
            disabled={!hasAnswer || locationValidation.isSubmitting || geolocation.isLoading}
            onClick={(): void => {
              play("tap");
              void validateWithGps();
            }}
          >
            {geolocation.isLoading ? t("quest.readingGps") : t("quest.validateWithGps")}
          </button>
          <button
            className="quest-button quest-button--ghost"
            type="button"
            disabled={!hasAnswer || locationValidation.isSubmitting}
            onClick={(): void => {
              play("tap");
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
            play("tap");
            void validateWithQr(payload);
          }}
          onError={(message: string): void => {
            setFeedbackMessage(message);
            play("error");
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
          disabled={!hasAnswer || !hasQrPayload || locationValidation.isSubmitting}
          onClick={(): void => {
            play("tap");
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
            : t("quest.expectedNextStopName", {
                stationName: nextLocationName ?? nextLocationSlug
              })}
        </p>
        {nextLocationSlug !== null ? (
          <p className="quest-muted">{t("quest.expectedNextStop", { slug: nextLocationSlug })}</p>
        ) : null}
        <Link className="app-link" to={ROUTES.home}>
          {t("quest.exitHome")}
        </Link>
      </section>

      <AbandonRunDialog
        isOpen={isAbandonDialogOpen}
        isSubmitting={runControl.isAbandoning}
        errorMessage={runControl.abandonErrorMessage}
        onCancel={(): void => {
          setIsAbandonDialogOpen(false);
        }}
        onConfirm={(): void => {
          void handleConfirmAbandon();
        }}
      />
    </main>
  );
}

export default QuestLocationPage;
