import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type JSX
} from "react";
import { useNavigate } from "react-router-dom";

import type { RouteOverview } from "@/application/use-cases/list-routes.use-case";
import { useLanguage } from "@/presentation/app/LanguageContext";
import { QrScannerPanel } from "@/presentation/components/quest/QrScannerPanel";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import type { TranslationKey } from "@/presentation/i18n/translations";
import {
  DEFAULT_PLAYER_ALIAS,
  PLAYER_ALIAS_STORAGE_KEY
} from "@/shared/constants/app.constants";
import { toRouteLocationPath } from "@/shared/config/routes";
import { parseRouteLocationPayload } from "@/shared/utils/validation-guard";

interface LocalizedRouteDisplay {
  readonly name: string;
  readonly description: string;
}

function localizeRouteDisplay(
  route: RouteOverview,
  fallbackDescription: string,
  t: (key: TranslationKey) => string
): LocalizedRouteDisplay {
  switch (route.slug) {
    case "short":
      return {
        name: t("home.route.short.name"),
        description: t("home.route.short.description")
      };
    case "medium":
      return {
        name: t("home.route.medium.name"),
        description: t("home.route.medium.description")
      };
    case "long":
      return {
        name: t("home.route.long.name"),
        description: t("home.route.long.description")
      };
    default:
      return {
        name: route.name,
        description: route.description ?? fallbackDescription
      };
  }
}

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
      const routeDisplay = localizeRouteDisplay(route, t("home.defaultRouteDescription"), t);
      setErrorMessage(
        t("home.routeMissingFirstLocation", {
          routeName: routeDisplay.name
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
          {routes.map((route: RouteOverview): JSX.Element => {
            const routeDisplay = localizeRouteDisplay(
              route,
              t("home.defaultRouteDescription"),
              t
            );

            return (
              <article key={route.id} className="route-card">
                <h3 className="route-title">{routeDisplay.name}</h3>
                <p className="route-copy">{routeDisplay.description}</p>
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
            );
          })}
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
          onClose={(): void => {
            setIsScannerVisible(false);
          }}
          onDetected={(payload: string): void => {
            setIsScannerVisible(false);
            continueWithQrPayload(payload);
          }}
          onError={(message: string): void => {
            setErrorMessage(message);
          }}
        />
      </section>
    </main>
  );
}

export default HomePage;
