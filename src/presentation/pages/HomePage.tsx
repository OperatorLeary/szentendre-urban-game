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
import { useLanguage } from "@/presentation/app/LanguageContext";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import {
  DEFAULT_PLAYER_ALIAS,
  PLAYER_ALIAS_STORAGE_KEY
} from "@/shared/constants/app.constants";
import { toRouteLocationPath } from "@/shared/config/routes";
import { parseRouteLocationPayload } from "@/shared/utils/validation-guard";

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

function HomePage(): JSX.Element {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { gameUseCases, logger } = useAppServices();
  const [routes, setRoutes] = useState<readonly RouteOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerAlias, setPlayerAlias] = useState<string>(getStoredAlias());
  const [qrPayload, setQrPayload] = useState<string>("");
  const [isScannerVisible, setIsScannerVisible] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const loadRoutes = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

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
          setErrorMessage(
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

  const startRoute = (route: RouteOverview): void => {
    const routeStartLocationSlug: string | null = route.firstLocationSlug;
    if (routeStartLocationSlug === null) {
      setErrorMessage(
        t("home.routeMissingFirstLocation", {
          routeName: route.name
        })
      );
      return;
    }

    const normalizedAlias: string =
      playerAlias.trim().length === 0 ? DEFAULT_PLAYER_ALIAS : playerAlias.trim();
    setStoredAlias(normalizedAlias);

    logger.info("Starting route from home page.", {
      routeSlug: route.slug,
      firstLocationSlug: routeStartLocationSlug
    });

    navigate(toRouteLocationPath(route.slug, routeStartLocationSlug));
  };

  const parsedQrPayload = useMemo(
    () => parseRouteLocationPayload(qrPayload),
    [qrPayload]
  );

  const continueWithQrPayload = useCallback(
    (payload: string): void => {
      const parsedPayload = parseRouteLocationPayload(payload);
      if (parsedPayload === null) {
        setErrorMessage(t("home.qrPayloadInvalid"));
        return;
      }

      setStoredAlias(playerAlias);
      navigate(toRouteLocationPath(parsedPayload.routeSlug, parsedPayload.locationSlug));
    },
    [navigate, playerAlias, t]
  );

  return (
    <main className="quest-shell">
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
            }}
            onBlur={(): void => {
              setStoredAlias(playerAlias);
            }}
            minLength={2}
            maxLength={40}
          />
        </label>
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("home.routesTitle")}</h2>
        {isLoading ? <p className="quest-muted">{t("home.loadingRoutes")}</p> : null}
        {errorMessage !== null ? (
          <p className="quest-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="route-grid">
          {routes.map((route: RouteOverview): JSX.Element => (
            <article key={route.id} className="route-card">
              <h3 className="route-title">{route.name}</h3>
              <p className="route-copy">
                {route.description ?? t("home.defaultRouteDescription")}
              </p>
              <button
                className="quest-button"
                type="button"
                onClick={(): void => {
                  startRoute(route);
                }}
                disabled={route.firstLocationSlug === null}
              >
                {t("home.startRoute")}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("home.qrStartTitle")}</h2>
        <div className="quest-actions">
          <button
            className="quest-button quest-button--ghost"
            type="button"
            onClick={(): void => {
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
          onDetected={(payload: string): void => {
            setQrPayload(payload);
            setIsScannerVisible(false);
            continueWithQrPayload(payload);
          }}
          onError={(message: string): void => {
            setErrorMessage(message);
          }}
        />

        <label className="quest-field">
          <span className="quest-field-label">{t("home.pasteQrPayloadLabel")}</span>
          <input
            className="quest-input"
            value={qrPayload}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setQrPayload(event.target.value);
            }}
            placeholder={t("home.qrPayloadPlaceholder")}
          />
        </label>
        <button
          className="quest-button"
          type="button"
          onClick={(): void => {
            continueWithQrPayload(qrPayload);
          }}
          disabled={parsedQrPayload === null}
        >
          {t("home.continue")}
        </button>
      </section>
    </main>
  );
}

export default HomePage;
