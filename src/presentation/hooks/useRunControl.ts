import { useCallback, useState } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useAppServices } from "@/presentation/hooks/useAppServices";

interface UseRunControlResult {
  readonly isAbandoning: boolean;
  readonly abandonErrorMessage: string | null;
  abandonActiveRun: () => Promise<boolean>;
  resetAbandonError: () => void;
}

export function useRunControl(): UseRunControlResult {
  const { t } = useLanguage();
  const { gameUseCases } = useAppServices();
  const [isAbandoning, setIsAbandoning] = useState<boolean>(false);
  const [abandonErrorMessage, setAbandonErrorMessage] = useState<string | null>(
    null
  );

  const abandonActiveRun = useCallback(async (): Promise<boolean> => {
    setIsAbandoning(true);
    setAbandonErrorMessage(null);

    try {
      await gameUseCases.abandonActiveRun();
      return true;
    } catch (error) {
      setAbandonErrorMessage(
        error instanceof Error ? error.message : t("quest.abandonFailed")
      );
      return false;
    } finally {
      setIsAbandoning(false);
    }
  }, [gameUseCases, t]);

  const resetAbandonError = useCallback((): void => {
    setAbandonErrorMessage(null);
  }, []);

  return {
    isAbandoning,
    abandonErrorMessage,
    abandonActiveRun,
    resetAbandonError
  };
}

