import { useEffect, useMemo, useState, type ChangeEvent, type JSX } from "react";
import { useNavigate } from "react-router-dom";

import type { RouteOverview } from "@/application/use-cases/list-routes.use-case";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import {
  APP_NAME,
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
  const navigate = useNavigate();
  const { gameUseCases, logger } = useAppServices();
  const [routes, setRoutes] = useState<readonly RouteOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerAlias, setPlayerAlias] = useState<string>(getStoredAlias());
  const [qrPayload, setQrPayload] = useState<string>("");

  useEffect((): void => {
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
            error instanceof Error ? error.message : "Failed to load routes."
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
  }, [gameUseCases]);

  const startRoute = (route: RouteOverview): void => {
    const routeStartLocationSlug: string | null = route.firstLocationSlug;
    if (routeStartLocationSlug === null) {
      setErrorMessage(`Route "${route.name}" has no active locations configured.`);
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

  return (
    <main className="quest-shell">
      <section className="quest-hero-card">
        <h1 className="quest-hero-title">{APP_NAME}</h1>
        <p className="quest-hero-copy">
          Pick a route or paste a station QR link to start. One active run is enforced
          per device.
        </p>

        <label className="quest-field">
          <span className="quest-field-label">Player alias</span>
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
        <h2 className="quest-panel-title">Routes</h2>
        {isLoading ? <p className="quest-muted">Loading routes...</p> : null}
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
                {route.description ?? "Guided station route through Szentendre."}
              </p>
              <button
                className="quest-button"
                type="button"
                onClick={(): void => {
                  startRoute(route);
                }}
                disabled={route.firstLocationSlug === null}
              >
                Start route
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">Start from QR link</h2>
        <label className="quest-field">
          <span className="quest-field-label">Paste QR payload</span>
          <input
            className="quest-input"
            value={qrPayload}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              setQrPayload(event.target.value);
            }}
            placeholder="https://yourdomain.com/r/short/l/main-square"
          />
        </label>
        <button
          className="quest-button"
          type="button"
          onClick={(): void => {
            if (parsedQrPayload === null) {
              setErrorMessage("QR payload must contain /r/{routeSlug}/l/{locationSlug}.");
              return;
            }

            setStoredAlias(playerAlias);
            navigate(
              toRouteLocationPath(
                parsedQrPayload.routeSlug,
                parsedQrPayload.locationSlug
              )
            );
          }}
        >
          Continue
        </button>
      </section>
    </main>
  );
}

export default HomePage;
