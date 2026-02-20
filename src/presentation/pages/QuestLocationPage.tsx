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
import { isGlobalBypassAnswer } from "@/core/validation/checkin-bypass-policy";

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

function padTimeUnit(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDuration(durationMilliseconds: number): string {
  const totalSeconds: number = Math.max(Math.floor(durationMilliseconds / 1000), 0);
  const hours: number = Math.floor(totalSeconds / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;

  if (hours > 0) {
    return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
  }

  return `${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
}

function formatCompletedAtLabel(date: Date, language: AppLanguage): string {
  const locale: string = language === "hu" ? "hu-HU" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  initialY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words: readonly string[] = text.trim().split(/\s+/);
  if (words.length === 0 || text.trim().length === 0) {
    return initialY;
  }

  let line = "";
  let y = initialY;
  let lineCount = 0;

  for (const word of words) {
    const candidateLine: string = line.length === 0 ? word : `${line} ${word}`;
    const candidateWidth: number = context.measureText(candidateLine).width;
    if (candidateWidth <= maxWidth || line.length === 0) {
      line = candidateLine;
      continue;
    }

    context.fillText(line, x, y);
    line = word;
    y += lineHeight;
    lineCount += 1;

    if (lineCount >= maxLines - 1) {
      break;
    }
  }

  if (lineCount < maxLines) {
    context.fillText(line, x, y);
  }

  return y + lineHeight;
}

function createSummaryCardDataUrl(input: {
  readonly appName: string;
  readonly title: string;
  readonly routeName: string;
  readonly durationLabel: string;
  readonly stationsLabel: string;
  readonly completedAtLabel: string;
  readonly durationCaption: string;
  readonly stationsCaption: string;
  readonly completedAtCaption: string;
}): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (context === null) {
    return null;
  }

  const isDarkTheme: boolean = document.documentElement.dataset.theme === "dark";
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (isDarkTheme) {
    gradient.addColorStop(0, "#12263a");
    gradient.addColorStop(0.6, "#0d1d2c");
    gradient.addColorStop(1, "#183550");
  } else {
    gradient.addColorStop(0, "#eef6ff");
    gradient.addColorStop(0.6, "#deeeff");
    gradient.addColorStop(1, "#f7fbff");
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = isDarkTheme ? "rgba(19, 39, 57, 0.88)" : "rgba(255, 255, 255, 0.88)";
  context.strokeStyle = isDarkTheme ? "rgba(140, 175, 207, 0.44)" : "rgba(147, 182, 214, 0.54)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(48, 48, canvas.width - 96, canvas.height - 96, 26);
  context.fill();
  context.stroke();

  context.fillStyle = isDarkTheme ? "#d9ecff" : "#1b3b59";
  context.font = "700 34px 'Plus Jakarta Sans', sans-serif";
  context.fillText(input.appName, 88, 112);

  context.fillStyle = isDarkTheme ? "#f0f7ff" : "#0f2740";
  context.font = "800 54px 'Plus Jakarta Sans', sans-serif";
  context.fillText(input.title, 88, 178);

  context.font = "700 36px 'Plus Jakarta Sans', sans-serif";
  const metricsStartY: number = drawWrappedCanvasText(
    context,
    input.routeName,
    88,
    242,
    canvas.width - 176,
    42,
    2
  );

  context.font = "600 27px 'Plus Jakarta Sans', sans-serif";
  context.fillStyle = isDarkTheme ? "#c6dbef" : "#2f4d66";
  context.fillText(`${input.durationCaption}: ${input.durationLabel}`, 88, metricsStartY + 18);
  context.fillText(`${input.stationsCaption}: ${input.stationsLabel}`, 88, metricsStartY + 62);
  context.fillText(`${input.completedAtCaption}: ${input.completedAtLabel}`, 88, metricsStartY + 106);

  return canvas.toDataURL("image/png");
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
  const [isScannerVisible, setIsScannerVisible] = useState<boolean>(false);
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [completionTimestamp, setCompletionTimestamp] = useState<Date | null>(null);
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

  useEffect((): void => {
    if (runSession.data?.session.isCompleted === true && completionTimestamp === null) {
      setCompletionTimestamp(new Date());
      return;
    }

    if (runSession.data?.session.isCompleted !== true && completionTimestamp !== null) {
      setCompletionTimestamp(null);
    }
  }, [completionTimestamp, runSession.data?.session.isCompleted]);

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
      setCompletionTimestamp(new Date());
      setIsScannerVisible(false);
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

    if (activeLocation !== null && isGlobalBypassAnswer(answerText)) {
      const response = await locationValidation.validateWithQr(
        activeLocation.qrToken.toString()
      );

      if (response === null) {
        setFeedbackMessage(locationValidation.errorMessage ?? t("quest.qrValidationFailed"));
        play("error");
        return;
      }

      if (response.accepted) {
        setFeedbackMessage(t("quest.bypassAccepted"));
        play("success");
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason, t));
      play("error");
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
    activeLocation,
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
  const nextLocationName: string | null = runSession.data.session.nextLocation?.name ?? null;
  const summaryRouteSlug: string = runSession.data.route.slug;
  const isRunCompleted: boolean = runSession.data.session.isCompleted;
  const summaryCompletedAt: Date = completionTimestamp ?? new Date();
  const summaryDurationLabel: string = formatDuration(
    summaryCompletedAt.getTime() - runSession.data.run.startedAt.getTime()
  );
  const summaryStationsLabel: string = `${String(runSession.data.session.completedLocations)}/${String(runSession.data.session.totalLocations)}`;
  const summaryCompletedAtLabel: string = formatCompletedAtLabel(
    summaryCompletedAt,
    language
  );
  const summaryShareText: string = t("quest.summaryShareText", {
    routeName: localizedRouteTitle,
    duration: summaryDurationLabel,
    stations: summaryStationsLabel,
    completedAt: summaryCompletedAtLabel
  });

  const shareSummary = async (): Promise<void> => {
    if (!isRunCompleted) {
      return;
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: t("quest.summaryShareDialogTitle"),
          text: summaryShareText
        });
        setFeedbackMessage(t("quest.summaryShared"));
        play("success");
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        "clipboard" in navigator
      ) {
        await navigator.clipboard.writeText(summaryShareText);
        setFeedbackMessage(t("quest.summaryCopied"));
        play("success");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    setFeedbackMessage(t("quest.summaryShareFailed"));
    play("error");
  };

  const downloadSummaryCard = (): void => {
    if (!isRunCompleted) {
      return;
    }

    const cardDataUrl: string | null = createSummaryCardDataUrl({
      appName: t("app.name"),
      title: t("quest.summaryCardTitle"),
      routeName: localizedRouteTitle,
      durationLabel: summaryDurationLabel,
      stationsLabel: summaryStationsLabel,
      completedAtLabel: summaryCompletedAtLabel,
      durationCaption: t("quest.summaryDurationLabel"),
      stationsCaption: t("quest.summaryStationsLabel"),
      completedAtCaption: t("quest.summaryCompletedAtLabel")
    });

    if (cardDataUrl === null) {
      setFeedbackMessage(t("quest.summaryDownloadFailed"));
      play("error");
      return;
    }

    const downloadLink = document.createElement("a");
    const safeRouteSlug: string = summaryRouteSlug.replace(/[^a-z0-9-]/gi, "-");
    const timestamp: string = summaryCompletedAt
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-");

    downloadLink.href = cardDataUrl;
    downloadLink.download = `szentendre-quest-${safeRouteSlug}-${timestamp}.png`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    setFeedbackMessage(t("quest.summaryDownloadSuccess"));
    play("success");
  };

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
        {isRunCompleted ? (
          <>
            <h2 className="quest-panel-title">{t("quest.summaryTitle")}</h2>
            <p className="quest-copy">
              {t("quest.summarySubtitle", { routeName: localizedRouteTitle })}
            </p>
            <div className="quest-summary-grid">
              <div className="quest-summary-item">
                <p className="quest-summary-item-label">{t("quest.summaryDurationLabel")}</p>
                <p className="quest-summary-item-value">{summaryDurationLabel}</p>
              </div>
              <div className="quest-summary-item">
                <p className="quest-summary-item-label">{t("quest.summaryStationsLabel")}</p>
                <p className="quest-summary-item-value">{summaryStationsLabel}</p>
              </div>
              <div className="quest-summary-item quest-summary-item--wide">
                <p className="quest-summary-item-label">{t("quest.summaryCompletedAtLabel")}</p>
                <p className="quest-summary-item-value">{summaryCompletedAtLabel}</p>
              </div>
            </div>
            <article className="quest-summary-card" aria-label={t("quest.summaryCardTitle")}>
              <h3 className="quest-summary-card-title">{t("quest.summaryCardTitle")}</h3>
              <p className="quest-summary-card-copy">{localizedRouteTitle}</p>
              <p className="quest-summary-card-meta">
                {t("quest.summaryDurationLabel")}: {summaryDurationLabel}
              </p>
              <p className="quest-summary-card-meta">
                {t("quest.summaryStationsLabel")}: {summaryStationsLabel}
              </p>
              <p className="quest-summary-card-meta">
                {t("quest.summaryCompletedAtLabel")}: {summaryCompletedAtLabel}
              </p>
            </article>
            <div className="quest-actions">
              <button
                className="quest-button"
                type="button"
                onClick={(): void => {
                  play("tap");
                  void shareSummary();
                }}
              >
                {t("quest.summaryShareButton")}
              </button>
              <button
                className="quest-button quest-button--ghost"
                type="button"
                onClick={(): void => {
                  play("tap");
                  downloadSummaryCard();
                }}
              >
                {t("quest.summaryDownloadButton")}
              </button>
            </div>
            <p className="quest-muted">{t("quest.summaryPrivacyNote")}</p>
          </>
        ) : (
          <>
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
                setIsScannerVisible(false);
                play("tap");
                void validateWithQr(payload);
              }}
              onError={(message: string): void => {
                setFeedbackMessage(message);
                play("error");
              }}
            />
          </>
        )}

        {!isRunCompleted && computedDistanceFromTarget !== null ? (
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
