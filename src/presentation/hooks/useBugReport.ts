import { useCallback, useState } from "react";

import { toBugReportId, toLocationId, toRunId } from "@/core/types/identifiers.type";
import { useAppServices } from "@/presentation/hooks/useAppServices";

function generateIdentifier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface BugReportContextInput {
  readonly runId: string | null;
  readonly locationId: string | null;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
  readonly detectedDistanceMeters: number | null;
}

interface UseBugReportResult {
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly isSuccess: boolean;
  submitBugReport: (
    description: string,
    context: BugReportContextInput
  ) => Promise<boolean>;
  resetStatus: () => void;
}

export function useBugReport(): UseBugReportResult {
  const { gameUseCases } = useAppServices();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const submitBugReport = useCallback(
    async (
      description: string,
      context: BugReportContextInput
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setIsSuccess(false);

      try {
        const normalizedRunId =
          context.runId === null || context.runId.trim().length === 0
            ? null
            : toRunId(context.runId);
        const normalizedLocationId =
          context.locationId === null || context.locationId.trim().length === 0
            ? null
            : toLocationId(context.locationId);

        await gameUseCases.submitBugReport({
          bugReportId: toBugReportId(generateIdentifier()),
          runId: normalizedRunId,
          locationId: normalizedLocationId,
          gpsLatitude: context.gpsLatitude,
          gpsLongitude: context.gpsLongitude,
          detectedDistanceMeters: context.detectedDistanceMeters,
          description
        });

        setIsSuccess(true);
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to submit bug report."
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameUseCases]
  );

  const resetStatus = useCallback((): void => {
    setErrorMessage(null);
    setIsSuccess(false);
  }, []);

  return {
    isSubmitting,
    errorMessage,
    isSuccess,
    submitBugReport,
    resetStatus
  };
}
