export interface QrScannerReaderControls {
  stop: () => void;
}

export interface QrScannerStartAttempt {
  readonly name: "ideal_environment" | "environment" | "any_video";
  readonly constraints: MediaStreamConstraints;
}

export interface StartQrScannerWithFallbackInput<ResultType> {
  readonly reader: {
    decodeFromConstraints: (
      constraints: MediaStreamConstraints,
      videoElement: HTMLVideoElement,
      onDecode: (result: ResultType | undefined, error: unknown) => void
    ) => Promise<QrScannerReaderControls>;
  };
  readonly videoElement: HTMLVideoElement;
  readonly onDecode: (result: ResultType | undefined, error: unknown) => void;
  readonly attempts?: readonly QrScannerStartAttempt[];
  readonly onAttemptFailure?: (input: {
    readonly attempt: QrScannerStartAttempt;
    readonly error: unknown;
  }) => void;
}

const DEFAULT_SCANNER_START_ATTEMPTS: readonly QrScannerStartAttempt[] = [
  {
    name: "ideal_environment",
    constraints: {
      video: {
        facingMode: {
          ideal: "environment"
        }
      }
    }
  },
  {
    name: "environment",
    constraints: {
      video: {
        facingMode: "environment"
      }
    }
  },
  {
    name: "any_video",
    constraints: {
      video: true
    }
  }
];

export function getDefaultQrScannerStartAttempts(): readonly QrScannerStartAttempt[] {
  return DEFAULT_SCANNER_START_ATTEMPTS;
}

export async function startQrScannerWithFallback<ResultType>(
  input: StartQrScannerWithFallbackInput<ResultType>
): Promise<{
  readonly controls: QrScannerReaderControls;
  readonly attempt: QrScannerStartAttempt;
}> {
  const attempts: readonly QrScannerStartAttempt[] =
    input.attempts ?? DEFAULT_SCANNER_START_ATTEMPTS;
  if (attempts.length === 0) {
    throw new Error("No QR scanner start attempts are configured.");
  }

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const controls = await input.reader.decodeFromConstraints(
        attempt.constraints,
        input.videoElement,
        input.onDecode
      );
      return {
        controls,
        attempt
      };
    } catch (error) {
      lastError = error;
      input.onAttemptFailure?.({
        attempt,
        error
      });
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  if (typeof lastError === "string" && lastError.trim().length > 0) {
    throw new Error(lastError);
  }

  throw new Error("Failed to start QR scanner.");
}
