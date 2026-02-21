import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type JSX
} from "react";
import { useNavigate } from "react-router-dom";

import type { RouteOverview } from "@/application/use-cases/list-routes.use-case";
import {
  QR_ROUTE_PROFILES,
  type QrRouteProfile
} from "@/core/constants/route-profile.constants";
import {
  type PlayerAliasValidationReason,
  validatePlayerAlias
} from "@/core/validation/player-alias-policy";
import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import { localizeRouteDisplay, localizeRouteName } from "@/presentation/i18n/localize-route";
import {
  DEFAULT_PLAYER_ALIAS,
  PLAYER_ALIAS_STORAGE_KEY
} from "@/shared/constants/app.constants";
import { toRouteLocationPath } from "@/shared/config/routes";
import { parseRouteLocationPayload } from "@/shared/utils/validation-guard";

type PermissionProbeState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  | "checking";

const PREFLIGHT_DISMISSED_STORAGE_KEY = "szentendre-city-quest-permission-preflight-dismissed";

function getStoredAlias(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_ALIAS;
  }

  const value: string | null = window.localStorage.getItem(PLAYER_ALIAS_STORAGE_KEY);
  if (value === null || value.trim().length === 0) {
    return DEFAULT_PLAYER_ALIAS;
  }

  return value.trim();
}

function setStoredAlias(alias: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAYER_ALIAS_STORAGE_KEY, alias.trim());
}

function getStoredPreflightDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PREFLIGHT_DISMISSED_STORAGE_KEY) === "1";
}

function setStoredPreflightDismissed(value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PREFLIGHT_DISMISSED_STORAGE_KEY, value ? "1" : "0");
}

function toPermissionStatusLabel(
  status: PermissionProbeState,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  switch (status) {
    case "granted":
      return t("home.permissionStatusGranted");
    case "denied":
      return t("home.permissionStatusDenied");
    case "prompt":
      return t("home.permissionStatusPrompt");
    case "checking":
      return t("home.permissionStatusChecking");
    case "unsupported":
      return t("home.permissionStatusUnsupported");
    default:
      return t("home.permissionStatusUnknown");
  }
}

function getAliasValidationMessage(
  reason: PlayerAliasValidationReason | null,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  switch (reason) {
    case "too_short":
    case "too_long":
      return t("home.playerAliasInvalidLength");
    case "contains_url_or_contact":
      return t("home.playerAliasContainsLinkOrContact");
    case "contains_blocked_content":
      return t("home.playerAliasBlockedContent");
    default:
      return t("home.playerAliasBlockedContent");
  }
}

function HomePage(): JSX.Element {
  const { t } = useLanguage();
  const { play } = useSound();
  const navigate = useNavigate();
  const { gameUseCases, logger } = useAppServices();
  const [routes, setRoutes] = useState<readonly RouteOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);
  const [aliasErrorMessage, setAliasErrorMessage] = useState<string | null>(null);
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string | null>(null);
  const [playerAlias, setPlayerAlias] = useState<string>(getStoredAlias());
  const [selectedQrProfile, setSelectedQrProfile] = useState<QrRouteProfile>("short");
  const [isScannerVisible, setIsScannerVisible] = useState<boolean>(false);
  const [isPreflightDismissed, setIsPreflightDismissed] = useState<boolean>(
    getStoredPreflightDismissed
  );
  const [gpsPermission, setGpsPermission] = useState<PermissionProbeState>("unknown");
  const [cameraPermission, setCameraPermission] = useState<PermissionProbeState>("unknown");

  const probePermissions = useCallback(async (): Promise<void> => {
    if (typeof navigator === "undefined") {
      setGpsPermission("unsupported");
      setCameraPermission("unsupported");
      return;
    }

    if (!("geolocation" in navigator)) {
      setGpsPermission("unsupported");
    } else if (!("permissions" in navigator)) {
      setGpsPermission("unknown");
    } else {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        setGpsPermission(result.state);
      } catch {
        setGpsPermission("unknown");
      }
    }

    if (
      !("mediaDevices" in navigator) ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraPermission("unsupported");
    } else if (!("permissions" in navigator)) {
      setCameraPermission("unknown");
    } else {
      try {
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName
        });
        setCameraPermission(result.state);
      } catch {
        setCameraPermission("unknown");
      }
    }
  }, []);

  useEffect(() => {
    void probePermissions();
  }, [probePermissions]);

  useEffect(() => {
    let isCancelled = false;

    const loadRoutes = async (): Promise<void> => {
      setIsLoading(true);
      setRouteErrorMessage(null);

      try {
        const activeRoutes = await gameUseCases.listRoutes();
        if (!isCancelled) {
          const routeOrder = new Map<string, number>([
            ["short", 1],
            ["medium", 2],
            ["long", 3]
          ]);
          const sortedRoutes = [...activeRoutes].sort((a, b): number => {
            const orderA: number = routeOrder.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
            const orderB: number = routeOrder.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
          });

          setRoutes(sortedRoutes);
        }
      } catch (error) {
        if (!isCancelled) {
          setRouteErrorMessage(
            error instanceof Error ? error.message : t("home.failedToLoadRoutes")
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadRoutes();

    return (): void => {
      isCancelled = true;
    };
  }, [gameUseCases, t]);

  useEffect(() => {
    if (aliasErrorMessage === null || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout((): void => {
      setAliasErrorMessage(null);
    }, 7_500);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [aliasErrorMessage]);

  useEffect(() => {
    if (scannerErrorMessage === null || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout((): void => {
      setScannerErrorMessage(null);
    }, 9_000);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [scannerErrorMessage]);

  const startRoute = (route: RouteOverview): void => {
    const routeStartLocationSlug: string | null = route.firstLocationSlug;
    if (routeStartLocationSlug === null) {
      play("error");
      const routeDisplay = localizeRouteDisplay(
        route.slug,
        route.name,
        route.description ?? t("home.defaultRouteDescription"),
        t
      );
      setRouteErrorMessage(
        t("home.routeMissingFirstLocation", {
          routeName: routeDisplay.name
        })
      );
      return;
    }

    const normalizedAlias: string =
      playerAlias.trim().length === 0 ? DEFAULT_PLAYER_ALIAS : playerAlias.trim();
    const aliasValidation = validatePlayerAlias(normalizedAlias);
    if (!aliasValidation.isValid) {
      setAliasErrorMessage(getAliasValidationMessage(aliasValidation.reason, t));
      play("error");
      return;
    }

    setAliasErrorMessage(null);
    setStoredAlias(normalizedAlias);

    logger.info("Starting route from home page.", {
      routeSlug: route.slug,
      firstLocationSlug: routeStartLocationSlug
    });

    play("tap");
    void navigate(toRouteLocationPath(route.slug, routeStartLocationSlug));
  };

  const continueWithQrPayload = useCallback(
    (payload: string): void => {
      const normalizedAlias: string =
        playerAlias.trim().length === 0 ? DEFAULT_PLAYER_ALIAS : playerAlias.trim();
      const aliasValidation = validatePlayerAlias(normalizedAlias);
      if (!aliasValidation.isValid) {
        setAliasErrorMessage(getAliasValidationMessage(aliasValidation.reason, t));
        play("error");
        return;
      }

      const parsedPayload = parseRouteLocationPayload(payload);
      if (parsedPayload === null) {
        setScannerErrorMessage(t("home.qrPayloadInvalid"));
        play("error");
        return;
      }

      const openFromQr = async (): Promise<void> => {
        let targetRouteSlug: string = parsedPayload.routeSlug;

        try {
          const resolvedEntryRoute = await gameUseCases.resolveQrEntryRoute({
            scannedRouteSlug: parsedPayload.routeSlug,
            locationSlug: parsedPayload.locationSlug,
            desiredProfile: selectedQrProfile
          });

          if (resolvedEntryRoute.routeSlug.length > 0) {
            targetRouteSlug = resolvedEntryRoute.routeSlug;
          }

          if (targetRouteSlug !== parsedPayload.routeSlug) {
            logger.info("QR entry remapped to a compatible route profile.", {
              scannedRouteSlug: parsedPayload.routeSlug,
              targetRouteSlug,
              locationSlug: parsedPayload.locationSlug,
              matchedRouteSlugs: resolvedEntryRoute.matchedRouteSlugs
            });
          }
        } catch (error) {
          logger.warn("Failed to resolve best QR entry route. Falling back to scanned route.", {
            scannedRouteSlug: parsedPayload.routeSlug,
            locationSlug: parsedPayload.locationSlug,
            cause: error instanceof Error ? error.message : String(error)
          });
        }

        play("tap");
        setAliasErrorMessage(null);
        setScannerErrorMessage(null);
        setStoredAlias(aliasValidation.normalizedAlias);
        const searchParams = new URLSearchParams();
        searchParams.set("entry", "qr");
        searchParams.set("profile", selectedQrProfile);
        await navigate({
          pathname: toRouteLocationPath(targetRouteSlug, parsedPayload.locationSlug),
          search: `?${searchParams.toString()}`
        });
      };

      void openFromQr();
    },
    [gameUseCases, logger, navigate, play, playerAlias, selectedQrProfile, t]
  );

  const requestGpsPermission = useCallback(async (): Promise<void> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGpsPermission("unsupported");
      return;
    }

    setGpsPermission("checking");

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (): void => {
          setGpsPermission("granted");
          resolve();
        },
        (): void => {
          setGpsPermission("denied");
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0
        }
      );
    });

    await probePermissions();
  }, [probePermissions]);

  const requestCameraPermission = useCallback(async (): Promise<void> => {
    if (
      typeof navigator === "undefined" ||
      !("mediaDevices" in navigator) ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraPermission("unsupported");
      return;
    }

    setCameraPermission("checking");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });

      stream.getTracks().forEach((track: MediaStreamTrack): void => {
        track.stop();
      });

      setCameraPermission("granted");
    } catch {
      setCameraPermission("denied");
    }

    await probePermissions();
  }, [probePermissions]);

  const showPermissionPreflight = useMemo((): boolean => {
    if (isPreflightDismissed) {
      return false;
    }

    const gpsReady = gpsPermission === "granted" || gpsPermission === "unsupported";
    const cameraReady =
      cameraPermission === "granted" || cameraPermission === "unsupported";

    return !(gpsReady && cameraReady);
  }, [cameraPermission, gpsPermission, isPreflightDismissed]);

  return (
    <main className="quest-shell">
      {showPermissionPreflight ? (
        <section className="quest-panel preflight-panel">
          <h2 className="quest-panel-title">{t("home.preflightTitle")}</h2>
          <p className="quest-copy">{t("home.preflightCopy")}</p>
          <div className="preflight-status-grid" role="list">
            <article className="preflight-status-card" role="listitem">
              <p className="preflight-status-title">{t("home.preflightGpsTitle")}</p>
              <p className="preflight-status-value">
                {toPermissionStatusLabel(gpsPermission, t)}
              </p>
              <button
                className="quest-button quest-button--ghost"
                type="button"
                data-testid="preflight-enable-gps"
                onClick={(): void => {
                  play("tap");
                  void requestGpsPermission();
                }}
                disabled={gpsPermission === "checking"}
              >
                {t("home.preflightEnableGps")}
              </button>
            </article>
            <article className="preflight-status-card" role="listitem">
              <p className="preflight-status-title">{t("home.preflightCameraTitle")}</p>
              <p className="preflight-status-value">
                {toPermissionStatusLabel(cameraPermission, t)}
              </p>
              <button
                className="quest-button quest-button--ghost"
                type="button"
                data-testid="preflight-enable-camera"
                onClick={(): void => {
                  play("tap");
                  void requestCameraPermission();
                }}
                disabled={cameraPermission === "checking"}
              >
                {t("home.preflightEnableCamera")}
              </button>
            </article>
          </div>
          <div className="quest-actions">
            <button
              className="quest-button"
              type="button"
              data-testid="preflight-continue"
              onClick={(): void => {
                play("tap");
                setStoredPreflightDismissed(true);
                setIsPreflightDismissed(true);
              }}
            >
              {t("home.preflightContinue")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="quest-hero-card">
        <h1 className="quest-hero-title">{t("app.name")}</h1>
        <p className="quest-hero-copy">{t("home.heroCopy")}</p>

        <label className="quest-field">
          <span className="quest-field-label">{t("home.playerAliasLabel")}</span>
          <input
            className="quest-input"
            value={playerAlias}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setPlayerAlias(event.target.value);
              setAliasErrorMessage(null);
            }}
            onBlur={(): void => {
              setStoredAlias(playerAlias);
            }}
            minLength={2}
            maxLength={40}
          />
        </label>
        {aliasErrorMessage !== null ? (
          <p className="quest-error" role="alert">
            {aliasErrorMessage}
          </p>
        ) : null}
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("home.routesTitle")}</h2>
        {isLoading ? <p className="quest-muted">{t("home.loadingRoutes")}</p> : null}
        {routeErrorMessage !== null ? (
          <p className="quest-error" role="alert">
            {routeErrorMessage}
          </p>
        ) : null}
        <div className="route-grid">
          {routes.map((route: RouteOverview): JSX.Element => {
            const routeDisplay = localizeRouteDisplay(
              route.slug,
              route.name,
              route.description ?? t("home.defaultRouteDescription"),
              t
            );

            return (
              <article
                key={route.id}
                className="route-card"
                data-testid={`route-card-${route.slug}`}
              >
                <h3 className="route-title">{routeDisplay.name}</h3>
                <p className="route-copy">{routeDisplay.description}</p>
                <p className="route-meta" data-testid={`route-meta-${route.slug}`}>
                  {t("home.routeMeta", {
                    stations: String(route.locationCount),
                    minutes: String(route.estimatedDurationMinutes)
                  })}
                </p>
                <button
                  className="quest-button"
                  type="button"
                  data-testid={`route-start-${route.slug}`}
                  onClick={(): void => {
                    startRoute(route);
                  }}
                  disabled={route.firstLocationSlug === null}
                >
                  {t("home.startRoute")}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("home.qrStartTitle")}</h2>
        <p className="quest-field-label">{t("home.qrProfileLabel")}</p>
        <div
          className="quest-navigation-toggle"
          role="radiogroup"
          aria-label={t("home.qrProfileLabel")}
          data-testid="qr-profile-selector"
        >
          {QR_ROUTE_PROFILES.map((profile: QrRouteProfile): JSX.Element => (
            <button
              key={profile}
              className={`theme-switcher-button ${
                selectedQrProfile === profile ? "theme-switcher-button--active" : ""
              }`}
              type="button"
              data-testid={`qr-profile-${profile}`}
              role="radio"
              aria-checked={selectedQrProfile === profile}
              onClick={(): void => {
                play("tap");
                setSelectedQrProfile(profile);
              }}
            >
              {localizeRouteName(profile, profile, t)}
            </button>
          ))}
        </div>
        <div className="quest-actions">
          <button
            className="quest-button quest-button--ghost"
            type="button"
            data-testid="qr-scan-toggle"
            onClick={(): void => {
              play("tap");
              setScannerErrorMessage(null);
              setIsScannerVisible((isVisible: boolean): boolean => !isVisible);
            }}
          >
            {isScannerVisible
              ? t("home.hideCameraScanner")
              : t("home.scanQrWithCamera")}
          </button>
        </div>

        <QrScannerPanel
          isActive={isScannerVisible}
          onClose={(): void => {
            setIsScannerVisible(false);
          }}
          onDetected={(payload: string): void => {
            setIsScannerVisible(false);
            setScannerErrorMessage(null);
            continueWithQrPayload(payload);
          }}
          onError={(message: string): void => {
            setScannerErrorMessage(message);
          }}
        />
        {scannerErrorMessage !== null ? (
          <p className="quest-error" role="alert">
            {scannerErrorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default HomePage;
