import { useCallback, useEffect, useMemo, useState } from "react";

import type { EnsureRunSessionResponse } from "@/application/use-cases/ensure-run-session.use-case";
import { AppError } from "@/core/errors/app-error";
import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import { useLanguage } from "@/presentation/app/LanguageContext";
import { useAppServices } from "@/presentation/hooks/useAppServices";
import {
  DEFAULT_PLAYER_ALIAS,
  PLAYER_ALIAS_STORAGE_KEY
} from "@/shared/constants/app.constants";

interface UseRunSessionInput {
  readonly routeSlug: string;
  readonly locationSlug: string;
  readonly enabled: boolean;
}

interface UseRunSessionState {
  readonly data: EnsureRunSessionResponse | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly errorContext: Readonly<Record<string, unknown>> | null;
}

const INITIAL_STATE: UseRunSessionState = {
  data: null,
  isLoading: false,
  errorMessage: null,
  errorContext: null
};

interface UseRunSessionResult {
  readonly data: EnsureRunSessionResponse | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly errorContext: Readonly<Record<string, unknown>> | null;
  readonly session: GameSessionSnapshot | null;
  refresh: () => Promise<void>;
  setSession: (session: GameSessionSnapshot) => void;
}

function getStoredPlayerAlias(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_ALIAS;
  }

  const value: string | null = window.localStorage.getItem(PLAYER_ALIAS_STORAGE_KEY);
  if (value === null || value.trim().length === 0) {
    return DEFAULT_PLAYER_ALIAS;
  }

  return value.trim();
}

export function useRunSession(input: UseRunSessionInput): UseRunSessionResult {
  const { t } = useLanguage();
  const { gameUseCases } = useAppServices();
  const [state, setState] = useState<UseRunSessionState>(INITIAL_STATE);

  const refresh = useCallback(async (): Promise<void> => {
    if (!input.enabled) {
      setState(INITIAL_STATE);
      return;
    }

    setState((previous: UseRunSessionState): UseRunSessionState => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
      errorContext: null
    }));

    try {
      const response: EnsureRunSessionResponse =
        await gameUseCases.ensureRunSession({
          routeSlug: input.routeSlug,
          locationSlug: input.locationSlug,
          playerAlias: getStoredPlayerAlias()
        });

      setState({
        data: response,
        isLoading: false,
        errorMessage: null,
        errorContext: null
      });
    } catch (error) {
      const fallbackMessage = t("runSession.loadFailed");
      const message: string =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : fallbackMessage;
      const errorContext: Readonly<Record<string, unknown>> | null =
        error instanceof AppError ? error.context : null;

      setState({
        data: null,
        isLoading: false,
        errorMessage: message,
        errorContext
      });
    }
  }, [gameUseCases, input.enabled, input.locationSlug, input.routeSlug, t]);

  const setSession = useCallback((session: GameSessionSnapshot): void => {
    setState((previousState: UseRunSessionState): UseRunSessionState => {
      if (previousState.data === null) {
        return previousState;
      }

      return {
        ...previousState,
        data: {
          ...previousState.data,
          session
        }
      };
    });
  }, []);

  useEffect((): void => {
    void refresh();
  }, [refresh]);

  const session = useMemo(
    (): GameSessionSnapshot | null => state.data?.session ?? null,
    [state.data]
  );

  return {
    data: state.data,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    errorContext: state.errorContext,
    session,
    refresh,
    setSession
  };
}
