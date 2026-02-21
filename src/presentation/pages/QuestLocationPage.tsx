import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type JSX
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  type QrRouteProfile,
  parseQrRouteProfile
} from "@/core/constants/route-profile.constants";
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
type PendingValidation =
  | {
      readonly mode: "gps";
    }
  | {
      readonly mode: "qr";
      readonly payload: string;
      readonly successKey: TranslationKey;
    };

const NAVIGATION_MODE_STORAGE_KEY = "szentendre-city-quest-navigation-mode";
const NAVIGATION_MODES: readonly NavigationMode[] = ["text", "map"];

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
  let message: string;
  let actionHint: string;

  switch (reason) {
    case "outside_radius":
      message = translate("quest.reason.outside_radius");
      actionHint = translate("quest.actionHint.outside_radius");
      break;
    case "incorrect_answer":
      message = translate("quest.reason.incorrect_answer");
      actionHint = translate("quest.actionHint.incorrect_answer");
      break;
    case "out_of_order":
      message = translate("quest.reason.out_of_order");
      actionHint = translate("quest.actionHint.out_of_order");
      break;
    case "already_checked_in":
      message = translate("quest.reason.already_checked_in");
      actionHint = translate("quest.actionHint.already_checked_in");
      break;
    case "mismatch":
      message = translate("quest.reason.mismatch");
      actionHint = translate("quest.actionHint.mismatch");
      break;
    case "malformed":
      message = translate("quest.reason.malformed");
      actionHint = translate("quest.actionHint.malformed");
      break;
    case "run_not_active":
      message = translate("quest.reason.run_not_active");
      actionHint = translate("quest.actionHint.run_not_active");
      break;
    default:
      message = translate("quest.reason.default");
      actionHint = translate("quest.actionHint.default");
      break;
  }

  return `${message} ${actionHint}`;
}

const SUCCESS_CHEER_KEYS: readonly TranslationKey[] = [
  "quest.cheer.1",
  "quest.cheer.2",
  "quest.cheer.3",
  "quest.cheer.4",
  "quest.cheer.5"
];

function buildSuccessFeedback(
  baseKey: TranslationKey,
  session: GameSessionSnapshot,
  translate: (key: TranslationKey) => string
): string {
  const cheerKey: TranslationKey =
    SUCCESS_CHEER_KEYS[Math.max(session.completedLocations - 1, 0) % SUCCESS_CHEER_KEYS.length] ??
    "quest.cheer.1";
  return `${translate(baseKey)} ${translate(cheerKey)}`;
}

interface ParsedQuestionOption {
  readonly key: string;
  readonly label: string;
}

function parseQuestionOptions(questionPrompt: string): readonly ParsedQuestionOption[] {
  const lineOptions = questionPrompt
    .split(/\r?\n/)
    .flatMap((line): readonly ParsedQuestionOption[] => {
      const optionMatch = line.match(/^\s*([a-z])\)\s*(.+)\s*$/i);
      if (optionMatch === null) {
        return [];
      }

      const optionKey = optionMatch[1]?.trim().toLowerCase() ?? "";
      const optionLabel = optionMatch[2]?.trim() ?? "";
      if (optionKey.length === 0 || optionLabel.length === 0) {
        return [];
      }

      return [
        {
          key: optionKey,
          label: optionLabel
        }
      ];
    });

  if (lineOptions.length > 0) {
    return lineOptions;
  }

  const inlineOptions: ParsedQuestionOption[] = [];
  const optionPattern =
    /(?:^|\s)([a-z])\)\s*([^]+?)(?=(?:\s+[a-z]\)\s)|(?:\r?\n)|$)/gim;
  for (const optionMatch of questionPrompt.matchAll(optionPattern)) {
    const optionKey: string = optionMatch[1]?.trim().toLowerCase() ?? "";
    const optionLabel: string = optionMatch[2]?.trim() ?? "";
    if (optionKey.length === 0 || optionLabel.length === 0) {
      continue;
    }

    inlineOptions.push({
      key: optionKey,
      label: optionLabel
    });
  }

  return inlineOptions;
}

function resolveInitialOnlineState(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function toProfileSearch(profile: QrRouteProfile | null): string {
  if (profile === null) {
    return "";
  }

  const searchParams = new URLSearchParams();
  searchParams.set("profile", profile);
  return `?${searchParams.toString()}`;
}

function triggerHapticFeedback(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(pattern);
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
  const [isOnline, setIsOnline] = useState<boolean>(resolveInitialOnlineState);
  const [pendingValidation, setPendingValidation] = useState<PendingValidation | null>(null);
  const [celebrationBurstToken, setCelebrationBurstToken] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [isFinalCelebration, setIsFinalCelebration] = useState<boolean>(false);
  const [isManualAnswerVisible, setIsManualAnswerVisible] = useState<boolean>(false);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(
    resolveInitialNavigationMode
  );
  const navigationModeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const runControl = useRunControl();

  const routeProfile = useMemo((): QrRouteProfile | null => {
    const params = new URLSearchParams(location.search);
    return parseQrRouteProfile(params.get("profile"));
  }, [location.search]);

  const preferRequestedStart = useMemo((): boolean => {
    const params = new URLSearchParams(location.search);
    return params.get("entry") === "qr";
  }, [location.search]);
  const profileSearch = useMemo((): string => toProfileSearch(routeProfile), [routeProfile]);

  const runSession = useRunSession({
    routeSlug: routeSelection.routeSlug,
    locationSlug: routeSelection.locationSlug,
    enabled: routeSelection.isValid,
    preferRequestedStart,
    routeProfile
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
      void navigate(
        {
          pathname: toRouteLocationPath(activeRouteSlug, activeNextLocationSlug),
          search: profileSearch
        },
        {
          replace: true
        }
      );
    }
  }, [navigate, profileSearch, runSession.errorContext]);

  useEffect((): void => {
    if (!preferRequestedStart || runSession.data === null) {
      return;
    }

    void navigate(
      {
        pathname: toRouteLocationPath(routeSelection.routeSlug, routeSelection.locationSlug),
        search: profileSearch
      },
      {
        replace: true
      }
    );
  }, [
    navigate,
    preferRequestedStart,
    profileSearch,
    routeSelection.locationSlug,
    routeSelection.routeSlug,
    runSession.data
  ]);

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

  const handleNavigationModeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction: number = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex: number =
        (index + direction + NAVIGATION_MODES.length) % NAVIGATION_MODES.length;
      const nextMode: NavigationMode = NAVIGATION_MODES[nextIndex] ?? navigationMode;
      setNavigationMode(nextMode);
      play("tap");
      navigationModeButtonRefs.current[nextIndex]?.focus();
    },
    [navigationMode, play]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = (): void => {
      setIsOnline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return (): void => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect((): void => {
    if (runSession.data?.session.isCompleted === true && completionTimestamp === null) {
      setCompletionTimestamp(new Date());
      return;
    }

    if (runSession.data?.session.isCompleted !== true && completionTimestamp !== null) {
      setCompletionTimestamp(null);
    }
  }, [completionTimestamp, runSession.data?.session.isCompleted]);

  const triggerCelebration = useCallback((isFinal: boolean): void => {
    setIsFinalCelebration(isFinal);
    setCelebrationBurstToken((previous: number): number => previous + 1);
    setShowCelebration(true);
    triggerHapticFeedback(isFinal ? [35, 45, 50] : 35);
  }, []);

  useEffect(() => {
    if (!showCelebration) {
      return;
    }

    const timeout = window.setTimeout(
      (): void => {
        setShowCelebration(false);
      },
      isFinalCelebration ? 1600 : 1000
    );

    return (): void => {
      window.clearTimeout(timeout);
    };
  }, [isFinalCelebration, showCelebration, celebrationBurstToken]);

  const locationValidation = useLocationValidation({
    runId: runSession.data?.run.id ?? "",
    routeSlug: runSession.data?.route.slug ?? routeSelection.routeSlug,
    routeProfile,
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
      void navigate(
        {
          pathname: toRouteLocationPath(runSession.data.route.slug, nextLocationSlug),
          search: profileSearch
        },
        {
          replace: true
        }
      );
    }
  }, [navigate, profileSearch, routeSelection.locationSlug, runSession.data]);

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
  const gpsSnapshotAgeSeconds: number | null =
    geolocation.snapshotAgeMilliseconds === null
      ? null
      : Math.max(0, Math.round(geolocation.snapshotAgeMilliseconds / 1000));
  const gpsSnapshotAgeLabel: string | null =
    gpsSnapshotAgeSeconds === null
      ? null
      : geolocation.isSnapshotStale
        ? t("quest.gpsSnapshotAgeStale", {
            seconds: String(gpsSnapshotAgeSeconds)
          })
        : t("quest.gpsSnapshotAge", {
            seconds: String(gpsSnapshotAgeSeconds)
          });

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
        triggerCelebration(true);
        play("finale");
        return;
      }

      triggerCelebration(false);
      play("success");

      if (runSession.data !== null) {
        void navigate({
          pathname: toRouteLocationPath(runSession.data.route.slug, nextLocationSlug),
          search: profileSearch
        });
      }
    },
    [navigate, play, profileSearch, runSession.data, t, triggerCelebration]
  );

  const performQrValidation = useCallback(
    async (
      payload: string,
      queueIfOffline: boolean,
      successKey: TranslationKey = "quest.qrAccepted"
    ): Promise<void> => {
      if (runSession.data === null || answerText.trim().length === 0) {
        setFeedbackMessage(t("quest.answerRequired"));
        return;
      }

      if (!isOnline) {
        if (queueIfOffline) {
          setPendingValidation({
            mode: "qr",
            payload,
            successKey
          });
          setFeedbackMessage(t("quest.offlineQueuedQr"));
        }
        return;
      }

      const response = await locationValidation.validateWithQr(payload);
      if (response === null) {
        if (!queueIfOffline) {
          setPendingValidation(null);
        }
        setFeedbackMessage(locationValidation.errorMessage ?? t("quest.qrValidationFailed"));
        play("error");
        return;
      }

      setPendingValidation(null);

      if (response.accepted) {
        setFeedbackMessage(buildSuccessFeedback(successKey, response.session, t));
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason, t));
      play("error");
    },
    [answerText, handleValidationSuccess, isOnline, locationValidation, play, runSession.data, t]
  );

  const performGpsValidation = useCallback(
    async (queueIfOffline: boolean): Promise<void> => {
      if (runSession.data === null || answerText.trim().length === 0) {
        setFeedbackMessage(t("quest.answerRequired"));
        return;
      }

      if (activeLocation !== null && isGlobalBypassAnswer(answerText)) {
        await performQrValidation(
          activeLocation.qrToken.toString(),
          queueIfOffline,
          "quest.bypassAccepted"
        );
        return;
      }

      if (!isOnline) {
        if (queueIfOffline) {
          setPendingValidation({
            mode: "gps"
          });
          setFeedbackMessage(t("quest.offlineQueuedGps"));
        }
        return;
      }

      const geoSnapshot = await geolocation.requestCurrentPosition();
      if (geoSnapshot === null) {
        if (!queueIfOffline) {
          setPendingValidation(null);
        }
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
        if (!queueIfOffline) {
          setPendingValidation(null);
        }
        setFeedbackMessage(locationValidation.errorMessage ?? t("quest.gpsValidationFailed"));
        play("error");
        return;
      }

      setPendingValidation(null);

      if (response.accepted) {
        setFeedbackMessage(buildSuccessFeedback("quest.gpsAccepted", response.session, t));
        handleValidationSuccess(response.session);
        return;
      }

      setFeedbackMessage(mapValidationReason(response.reason, t));
      play("error");
      updateState({
        detectedDistanceMeters: response.distanceMeters ?? null
      });
    },
    [
      activeLocation,
      answerText,
      geolocation,
      handleValidationSuccess,
      isOnline,
      locationValidation,
      performQrValidation,
      play,
      runSession.data,
      t,
      updateState
    ]
  );

  const validateWithGps = useCallback(async (): Promise<void> => {
    await performGpsValidation(true);
  }, [performGpsValidation]);

  const validateWithQr = useCallback(
    async (payload: string): Promise<void> => {
      await performQrValidation(payload, true);
    },
    [performQrValidation]
  );

  const handleQuestScannerClose = useCallback((): void => {
    setIsScannerVisible(false);
  }, []);

  const handleQuestScannerDetected = useCallback(
    (payload: string): void => {
      setIsScannerVisible(false);
      play("tap");
      void validateWithQr(payload);
    },
    [play, validateWithQr]
  );

  const handleQuestScannerError = useCallback(
    (message: string): void => {
      setFeedbackMessage(message);
      play("error");
    },
    [play]
  );

  useEffect(() => {
    if (!isOnline || pendingValidation === null || locationValidation.isSubmitting) {
      return;
    }

    setFeedbackMessage(t("quest.onlineRetrying"));

    if (pendingValidation.mode === "gps") {
      void performGpsValidation(false);
      return;
    }

    void performQrValidation(
      pendingValidation.payload,
      false,
      pendingValidation.successKey
    );
  }, [
    isOnline,
    locationValidation.isSubmitting,
    pendingValidation,
    performGpsValidation,
    performQrValidation,
    t
  ]);

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

  const activeLocationIdForUiReset: string | null = runSession.data?.requestedLocation.id ?? null;
  useEffect((): void => {
    setIsManualAnswerVisible(false);
  }, [activeLocationIdForUiReset]);

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
    routeProfile ?? runSession.data.route.slug,
    runSession.data.route.name,
    t
  );
  const localizedQuestionPrompt: string =
    language === "hu" && activeLocation.questionPromptHu !== null
      ? activeLocation.questionPromptHu
      : activeLocation.questionPrompt;
  const questionOptions: readonly ParsedQuestionOption[] =
    parseQuestionOptions(localizedQuestionPrompt);
  const hasQuestionOptions: boolean = questionOptions.length >= 2;
  const shouldShowManualAnswerInput: boolean = !hasQuestionOptions || isManualAnswerVisible;
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
  const summaryRouteSlug: string = routeProfile ?? runSession.data.route.slug;
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
          {!isRunCompleted ? (
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
          ) : null}
        </div>
        <p className="quest-muted" data-testid="quest-progress-ratio">
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
        <p className="quest-muted" data-testid="quest-station-label">
          {t("quest.station")} {activeLocation.sequenceNumber}: {activeLocation.name}
        </p>
        {!isOnline ? (
          <p className="quest-offline-indicator" role="status">
            {pendingValidation === null
              ? t("quest.offlineBanner")
              : t("quest.offlineBannerQueued")}
          </p>
        ) : null}
      </section>

      <section className="quest-panel">
        <div className="quest-navigation-header">
          <h2 className="quest-panel-title">{t("quest.navigationTitle")}</h2>
          <div
            className="quest-navigation-toggle"
            role="radiogroup"
            aria-label={t("quest.navigationTitle")}
          >
            {NAVIGATION_MODES.map((mode: NavigationMode, index: number): JSX.Element => (
              <button
                key={mode}
                ref={(element): void => {
                  navigationModeButtonRefs.current[index] = element;
                }}
                className={`theme-switcher-button ${
                  navigationMode === mode ? "theme-switcher-button--active" : ""
                }`}
                type="button"
                role="radio"
                aria-checked={navigationMode === mode}
                tabIndex={navigationMode === mode ? 0 : -1}
                onKeyDown={(event): void => {
                  handleNavigationModeKeyDown(event, index);
                }}
                onClick={(): void => {
                  play("tap");
                  setNavigationMode(mode);
                }}
              >
                {mode === "text" ? t("quest.navigationTextMode") : t("quest.navigationMapMode")}
              </button>
            ))}
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
            <p className="quest-summary-badge" data-testid="quest-completed-state">
              {t("quest.summaryFinaleBadge")}
            </p>
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
              <Link className="quest-button quest-button--ghost" to={ROUTES.home}>
                {t("quest.summaryStartAnotherRoute")}
              </Link>
            </div>
            <p className="quest-muted">{t("quest.summaryPrivacyNote")}</p>
          </>
        ) : (
          <>
            <h2 className="quest-panel-title">{t("quest.questionTitle")}</h2>
            <p className="quest-copy quest-question-prompt">{localizedQuestionPrompt}</p>
            {questionOptions.length > 0 ? (
              <div className="quest-choice-grid" data-testid="quest-choice-grid">
                {questionOptions.map((option, optionIndex) => {
                  const normalizedAnswer = answerText.trim().toLowerCase();
                  const optionLabelNormalized = option.label.toLowerCase();
                  const isSelected =
                    normalizedAnswer === option.key || normalizedAnswer === optionLabelNormalized;
                  const kahootVariant = optionIndex % 4;
                  const isLastOddOption =
                    questionOptions.length % 2 === 1 &&
                    optionIndex === questionOptions.length - 1;

                  return (
                    <button
                      key={`${option.key}-${option.label}`}
                      type="button"
                      className={`quest-choice-button quest-choice-button--kahoot-${String(
                        kahootVariant
                      )}${isSelected ? " is-selected" : ""}${
                        isLastOddOption ? " quest-choice-button--full-row" : ""
                      }`}
                      onClick={(): void => {
                        play("tap");
                        setAnswerText(option.key);
                      }}
                    >
                      <span className={`quest-choice-marker quest-choice-marker--kahoot-${String(kahootVariant)}`}>
                        {kahootVariant === 0
                          ? "▲"
                          : kahootVariant === 1
                            ? "◆"
                            : kahootVariant === 2
                              ? "●"
                              : "■"}
                      </span>
                      <span className="quest-choice-key">{option.key})</span> {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {hasQuestionOptions ? (
              <button
                type="button"
                className="quest-button quest-button--ghost quest-manual-answer-toggle"
                onClick={(): void => {
                  play("tap");
                  setIsManualAnswerVisible((current): boolean => !current);
                }}
              >
                {isManualAnswerVisible
                  ? t("quest.hideManualAnswerInput")
                  : t("quest.showManualAnswerInput")}
              </button>
            ) : null}
            {shouldShowManualAnswerInput ? (
              <>
                <label className="quest-field">
                  <span className="quest-field-label">{t("quest.yourAnswerLabel")}</span>
                  <input
                    className="quest-input"
                    data-testid="quest-answer-input"
                    value={answerText}
                    placeholder={t("quest.yourAnswerLabel")}
                    aria-label={t("quest.yourAnswerLabel")}
                    autoComplete="off"
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
              </>
            ) : null}

            <div className="quest-actions quest-actions--inline">
              <button
                className="quest-button"
                type="button"
                data-testid="validate-gps-button-desktop"
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
                data-testid="validate-qr-button-desktop"
                disabled={!hasAnswer || locationValidation.isSubmitting}
                onClick={(): void => {
                  play("tap");
                  setIsScannerVisible((isVisible: boolean): boolean => !isVisible);
                }}
              >
                {isScannerVisible ? t("quest.hideQrScanner") : t("quest.scanQrOverride")}
              </button>
            </div>
            <div className="quest-mobile-actionbar" role="group" aria-label={t("quest.questionTitle")}>
              <button
                className="quest-button"
                type="button"
                data-testid="validate-gps-button-mobile"
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
                data-testid="validate-qr-button-mobile"
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
              onClose={handleQuestScannerClose}
              onDetected={handleQuestScannerDetected}
              onError={handleQuestScannerError}
            />
          </>
        )}

        {!isRunCompleted && gpsSnapshotAgeLabel !== null ? (
          <p
            className={`quest-gps-age ${
              geolocation.isSnapshotStale ? "quest-gps-age--stale" : ""
            }`}
            role="status"
          >
            {gpsSnapshotAgeLabel}
          </p>
        ) : null}
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

      {showCelebration ? (
        <section
          key={`${String(celebrationBurstToken)}-${isFinalCelebration ? "final" : "step"}`}
          className={`checkpoint-celebration ${
            isFinalCelebration ? "checkpoint-celebration--final" : ""
          }`}
          aria-hidden="true"
        >
          {Array.from({ length: isFinalCelebration ? 24 : 14 }).map((_, index: number) => (
            <span
              key={index}
              className="checkpoint-confetti"
              style={{
                left: `${String((index / (isFinalCelebration ? 24 : 14)) * 100)}%`,
                animationDelay: `${String(index * 22)}ms`
              }}
            />
          ))}
        </section>
      ) : null}

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
