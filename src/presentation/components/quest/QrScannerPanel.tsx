import { useCallback, useEffect, useRef, type JSX } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";
import { cleanupQrScannerVideo } from "@/presentation/components/quest/qr-scanner-media.util";

interface QrScannerPanelProps {
  readonly isActive: boolean;
  readonly onDetected: (payload: string) => void;
  readonly onError: (message: string) => void;
  readonly onClose: () => void;
}

interface ReaderControls {
  stop: () => void;
}

const SCANNER_ERROR_THROTTLE_MS = 2200;
const SCANNER_START_TIMEOUT_MS = 10_000;

function logScannerEvent(event: string, metadata?: Readonly<Record<string, unknown>>): void {
  if (metadata !== undefined) {
    console.info(`[QrScannerPanel] ${event}`, metadata);
    return;
  }

  console.info(`[QrScannerPanel] ${event}`);
}

function mapScannerErrorMessage(
  error: unknown,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  const rawMessage: string =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const signal: string = rawMessage.toLowerCase();

  if (
    signal.includes("notallowederror") ||
    signal.includes("permission denied") ||
    signal.includes("permissiondismissederror")
  ) {
    return t("qrScanner.permissionDenied");
  }

  if (
    signal.includes("notfounderror") ||
    signal.includes("requested device not found") ||
    signal.includes("overconstrainederror")
  ) {
    return t("qrScanner.noCamera");
  }

  if (signal.includes("secure context") || signal.includes("https")) {
    return t("qrScanner.insecureContext");
  }

  if (rawMessage.trim().length > 0) {
    return rawMessage;
  }

  return t("qrScanner.startFailed");
}

export function QrScannerPanel({
  isActive,
  onDetected,
  onError,
  onClose
}: QrScannerPanelProps): JSX.Element | null {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const lastErrorRef = useRef<{ readonly message: string; readonly timestamp: number } | null>(
    null
  );
  const onDetectedRef = useRef<(payload: string) => void>(onDetected);
  const onErrorRef = useRef<(message: string) => void>(onError);

  useEffect((): void => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  }, [onDetected, onError]);

  const requestClose = useCallback((): void => {
    logScannerEvent("close_requested");
    onClose();
  }, [onClose]);

  useDialogA11y({
    isOpen: isActive,
    containerRef: frameRef,
    onRequestClose: requestClose
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!isActive) {
      document.body.classList.remove("scanner-active");
      return;
    }

    document.body.classList.add("scanner-active");
    return (): void => {
      document.body.classList.remove("scanner-active");
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let controls: ReaderControls | null = null;
    let isCancelled = false;
    let isStreamReady = false;
    let startupTimeoutId: number | undefined;
    const videoElement = videoRef.current;

    if (videoElement === null) {
      logScannerEvent("start_aborted_missing_video_element");
      return;
    }

    const handleVideoPlaying = (): void => {
      isStreamReady = true;
      if (startupTimeoutId !== undefined) {
        window.clearTimeout(startupTimeoutId);
        startupTimeoutId = undefined;
      }
      logScannerEvent("stream_ready");
    };

    videoElement.addEventListener("playing", handleVideoPlaying);

    startupTimeoutId = window.setTimeout((): void => {
      if (isCancelled || isStreamReady) {
        return;
      }

      const timeoutMessage = t("qrScanner.startFailed");
      logScannerEvent("start_timeout", {
        timeoutMs: SCANNER_START_TIMEOUT_MS
      });
      onErrorRef.current(timeoutMessage);
    }, SCANNER_START_TIMEOUT_MS);

    const startScanner = async (): Promise<void> => {
      try {
        logScannerEvent("start_attempt");
        const module = await import("@zxing/browser");
        const reader = new module.BrowserQRCodeReader();

        if (isCancelled) {
          return;
        }

        controls = (await reader.decodeFromVideoDevice(
          undefined,
          videoElement,
          (result, error): void => {
            if (isCancelled) {
              return;
            }

            if (result !== undefined) {
              const payload: string = result.getText();
              logScannerEvent("scan_success", {
                payloadLength: payload.length
              });
              controls?.stop();
              cleanupQrScannerVideo(videoElement);
              onDetectedRef.current(payload);
              return;
            }

            if (error !== undefined) {
              const message = mapScannerErrorMessage(error, t);
              if (message.length > 0 && !message.includes("NotFoundException")) {
                const now: number = Date.now();
                const previousError = lastErrorRef.current;
                const isThrottled =
                  previousError !== null &&
                  previousError.message === message &&
                  now - previousError.timestamp < SCANNER_ERROR_THROTTLE_MS;
                if (isThrottled) {
                  return;
                }

                lastErrorRef.current = {
                  message,
                  timestamp: now
                };
                logScannerEvent("scan_error", {
                  message
                });
                onErrorRef.current(message);
              }
            }
          }
        )) as ReaderControls;
      } catch (error) {
        const mappedMessage = mapScannerErrorMessage(error, t);
        logScannerEvent("start_failed", {
          message: mappedMessage
        });
        onErrorRef.current(mappedMessage);
      }
    };

    void startScanner();

    return (): void => {
      isCancelled = true;
      if (startupTimeoutId !== undefined) {
        window.clearTimeout(startupTimeoutId);
      }
      videoElement.removeEventListener("playing", handleVideoPlaying);
      logScannerEvent("cleanup");
      controls?.stop();
      cleanupQrScannerVideo(videoElement);
    };
  }, [isActive, t]);

  if (!isActive) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <section
      className="qr-scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-hint"
      aria-describedby="qr-scanner-note"
      onMouseDown={(event): void => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className="qr-scanner-frame" ref={frameRef} tabIndex={-1}>
        <div className="qr-scanner-toolbar">
          <p id="qr-scanner-hint" className="qr-scanner-hint">
            {t("qrScanner.overlayHint")}
          </p>
          <button
            type="button"
            className="quest-button quest-button--ghost qr-scanner-close"
            onClick={requestClose}
          >
            {t("qrScanner.close")}
          </button>
        </div>
        <p id="qr-scanner-note" className="qr-scanner-note">
          {t("qrScanner.permissionHint")}
        </p>
        <video className="qr-scanner-video" ref={videoRef} muted playsInline />
      </div>
    </section>,
    document.body
  );
}
