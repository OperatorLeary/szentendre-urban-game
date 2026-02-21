import { useCallback, useEffect, useMemo, useState } from "react";

import type { EnsureRunSessionResponse } from "@/application/use-cases/ensure-run-session.use-case";
import type { QrRouteProfile } from "@/core/constants/route-profile.constants";
import { APP_ERROR_CODES } from "@/core/errors/error-codes";
import { validatePlayerAlias } from "@/core/validation/player-alias-policy";
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
  readonly preferRequestedStart?: boolean;
  readonly routeProfile?: QrRouteProfile | null;
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

function extractErrorSignal(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return [
      error.message,
      extractErrorSignal((error as { cause?: unknown }).cause)
    ]
      .filter((part: string): boolean => part.trim().length > 0)
      .join(" ");
  }

  if (typeof error === "object" && error !== null) {
    const errorLike = error as {
      readonly message?: unknown;
      readonly details?: unknown;
      readonly hint?: unknown;
      readonly code?: unknown;
      readonly cause?: unknown;
    };

    return [
      extractErrorSignal(errorLike.message),
      extractErrorSignal(errorLike.details),
      extractErrorSignal(errorLike.hint),
      extractErrorSignal(errorLike.code),
      extractErrorSignal(errorLike.cause)
    ]
      .filter((part: string): boolean => part.trim().length > 0)
      .join(" ");
  }

  return "";
}

function getFriendlyRunSessionErrorMessage(
  error: unknown,
  t: ReturnType<typeof useLanguage>["t"]
): string | null {
  if (error instanceof AppError) {
    switch (error.errorCode) {
      case APP_ERROR_CODES.playerAliasBlockedContent:
        return t("home.playerAliasBlockedContent");
      case APP_ERROR_CODES.playerAliasLinkOrContact:
        return t("home.playerAliasContainsLinkOrContact");
      case APP_ERROR_CODES.playerAliasInvalidLength:
        return t("home.playerAliasInvalidLength");
      default:
        break;
    }
  }

  const errorSignal: string = extractErrorSignal(error).toLowerCase();
  if (errorSignal.length === 0) {
    return null;
  }

  if (
    errorSignal.includes("player_alias_contains_blocked_content") ||
    errorSignal.includes("contains_blocked_content")
  ) {
    return t("home.playerAliasBlockedContent");
  }

  if (
    errorSignal.includes("player_alias_contact_or_url_not_allowed") ||
    errorSignal.includes("contains_url_or_contact")
  ) {
    return t("home.playerAliasContainsLinkOrContact");
  }

  if (
    errorSignal.includes("runs_player_alias_length_chk") ||
    (errorSignal.includes("player alias") && errorSignal.includes("length"))
  ) {
    return t("home.playerAliasInvalidLength");
  }

  return null;
}

function getStoredPlayerAlias(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_ALIAS;
  }

  const value: string | null = window.localStorage.getItem(PLAYER_ALIAS_STORAGE_KEY);
  if (value === null || value.trim().length === 0) {
    return DEFAULT_PLAYER_ALIAS;
  }

  const normalizedAlias: string = value.trim();
  const aliasValidation = validatePlayerAlias(normalizedAlias);
  if (!aliasValidation.isValid) {
    return DEFAULT_PLAYER_ALIAS;
  }

  return aliasValidation.normalizedAlias;
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
          playerAlias: getStoredPlayerAlias(),
          preferRequestedStart: input.preferRequestedStart ?? false,
          routeProfile: input.routeProfile ?? null
        });

      setState({
        data: response,
        isLoading: false,
        errorMessage: null,
        errorContext: null
      });
    } catch (error) {
      const fallbackMessage = t("runSession.loadFailed");
      const mappedMessage: string | null = getFriendlyRunSessionErrorMessage(error, t);
      const message: string =
        mappedMessage ??
        (error instanceof Error && error.message.trim().length > 0
          ? error.message
          : fallbackMessage);
      const errorContext: Readonly<Record<string, unknown>> | null =
        error instanceof AppError ? error.context : null;

      setState({
        data: null,
        isLoading: false,
        errorMessage: message,
        errorContext
      });
    }
  }, [
    gameUseCases,
    input.enabled,
    input.locationSlug,
    input.preferRequestedStart,
    input.routeProfile,
    input.routeSlug,
    t
  ]);

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
