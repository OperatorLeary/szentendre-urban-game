import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import {
  cleanupQrScannerVideo
} from "@/presentation/components/quest/qr-scanner-media.util";
import {
  getDefaultQrScannerStartAttempts,
  startQrScannerWithFallback,
  type QrScannerReaderControls
} from "@/presentation/components/quest/qr-scanner-start.util";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";

interface QrScannerPanelProps {
  readonly isActive: boolean;
  readonly onDetected: (payload: string) => void;
  readonly onError: (message: string) => void;
  readonly onClose: () => void;
}

type ScannerState = "idle" | "starting" | "ready" | "error";

interface QrScanResultLike {
  getText: () => string;
}

const SCANNER_ERROR_THROTTLE_MS = 2200;
const SCANNER_START_TIMEOUT_MS = 10_000;

function extractErrorText(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error !== null && typeof error === "object") {
    const candidate = error as {
      readonly message?: unknown;
      readonly name?: unknown;
      readonly code?: unknown;
    };
    if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
      return candidate.message;
    }

    if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
      return candidate.name;
    }

    if (typeof candidate.code === "string" && candidate.code.trim().length > 0) {
      return candidate.code;
    }
  }

  return "";
}

function toErrorSignal(error: unknown): string {
  const rawMessage: string = extractErrorText(error);
  return rawMessage.toLowerCase();
}

function isNotFoundDecodeSignal(signal: string): boolean {
  return signal.includes("notfoundexception");
}

function isFatalScannerSignal(signal: string): boolean {
  if (isNotFoundDecodeSignal(signal)) {
    return false;
  }

  return (
    signal.includes("notallowederror") ||
    signal.includes("permission denied") ||
    signal.includes("permissiondismissederror") ||
    signal.includes("notreadableerror") ||
    signal.includes("device in use") ||
    signal.includes("track start failed") ||
    signal.includes("could not start video source") ||
    signal.includes("aborterror") ||
    signal.includes("no_frames") ||
    signal.includes("camera stream did not become ready")
  );
}

function logScannerEvent(event: string, metadata?: Readonly<Record<string, unknown>>): void {
  if (metadata !== undefined) {
    console.info(`[QrScannerPanel] ${event}`, metadata);
    return;
  }

  console.info(`[QrScannerPanel] ${event}`);
}

function stopScannerControls(controls: QrScannerReaderControls | null): void {
  if (controls === null) {
    return;
  }

  controls.stop();
}

function mapScannerErrorMessage(
  error: unknown,
  t: ReturnType<typeof useLanguage>["t"]
): string {
  const rawMessage: string = extractErrorText(error);
  const signal: string = toErrorSignal(error);

  if (signal.includes("no_frames") || signal.includes("camera stream did not become ready")) {
    return t("qrScanner.noFrames");
  }

  if (
    signal.includes("notallowederror") ||
    signal.includes("permission denied") ||
    signal.includes("permissiondismissederror")
  ) {
    return t("qrScanner.permissionDenied");
  }

  if (
    signal.includes("notreadableerror") ||
    signal.includes("device in use") ||
    signal.includes("track start failed") ||
    signal.includes("could not start video source")
  ) {
    return t("qrScanner.cameraInUse");
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
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const translationRef = useRef<ReturnType<typeof useLanguage>["t"]>(t);
  const controlsRef = useRef<QrScannerReaderControls | null>(null);
  const lastErrorRef = useRef<{ readonly message: string; readonly timestamp: number } | null>(
    null
  );
  const onDetectedRef = useRef<(payload: string) => void>(onDetected);
  const onErrorRef = useRef<(message: string) => void>(onError);

  useEffect((): void => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  }, [onDetected, onError]);

  useEffect((): void => {
    translationRef.current = t;
  }, [t]);

  const requestClose = useCallback((): void => {
    logScannerEvent("close_requested");
    onClose();
  }, [onClose]);

  const requestRetry = useCallback((): void => {
    logScannerEvent("retry_requested");
    setIsRetrying(true);
    setScannerState("starting");
    setScannerErrorMessage(null);
    lastErrorRef.current = null;
    setRetryToken((value: number): number => value + 1);
  }, []);

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
    if (isActive) {
      return;
    }

    setScannerState("idle");
    setScannerErrorMessage(null);
    setIsRetrying(false);
    lastErrorRef.current = null;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isCancelled = false;
    let hasScannerActivity = false;
    const videoElement = videoRef.current;
    controlsRef.current = null;
    const isSessionCancelled = (): boolean => isCancelled;

    if (videoElement === null) {
      const missingVideoMessage = translationRef.current("qrScanner.startFailed");
      logScannerEvent("start_aborted_missing_video_element");
      setScannerState("error");
      setScannerErrorMessage(missingVideoMessage);
      onErrorRef.current(missingVideoMessage);
      return;
    }

    setScannerState("starting");
    setScannerErrorMessage(null);

    const markReady = (): void => {
      if (isCancelled || hasScannerActivity) {
        return;
      }

      hasScannerActivity = true;
      setScannerState("ready");
      setScannerErrorMessage(null);
      setIsRetrying(false);
      logScannerEvent("stream_ready");
    };

    const handleVideoSignal = (): void => {
      markReady();
    };

    videoElement.addEventListener("playing", handleVideoSignal);
    videoElement.addEventListener("loadedmetadata", handleVideoSignal);
    videoElement.addEventListener("canplay", handleVideoSignal);

    const startupTimeoutId = window.setTimeout((): void => {
      if (isCancelled || hasScannerActivity) {
        return;
      }

      const timeoutMessage = translationRef.current("qrScanner.noFrames");
      logScannerEvent("start_timeout", {
        timeoutMs: SCANNER_START_TIMEOUT_MS
      });
      reportScannerError(timeoutMessage);
    }, SCANNER_START_TIMEOUT_MS);

    const reportScannerError = (message: string): void => {
      if (isCancelled) {
        return;
      }

      setScannerState("error");
      setScannerErrorMessage(message);
      onErrorRef.current(message);
    };

    const startScanner = async (): Promise<void> => {
      try {
        logScannerEvent("start_attempt");
        const module = await import("@zxing/browser");
        if (isCancelled) {
          return;
        }

        const reader = new module.BrowserQRCodeReader();
        const scannerStartResult = await startQrScannerWithFallback<QrScanResultLike>({
          reader,
          videoElement,
          attempts: getDefaultQrScannerStartAttempts(),
          onDecode: (result, error): void => {
            if (isCancelled) {
              return;
            }

            markReady();

            if (result !== undefined) {
              const payload: string = result.getText();
              if (payload.trim().length === 0) {
                return;
              }

              logScannerEvent("scan_success", {
                payloadLength: payload.length
              });
              stopScannerControls(controlsRef.current);
              cleanupQrScannerVideo(videoElement);
              setScannerState("idle");
              setScannerErrorMessage(null);
              setIsRetrying(false);
              onDetectedRef.current(payload);
              return;
            }

            if (error === undefined) {
              return;
            }

            const signal = toErrorSignal(error);
            if (isNotFoundDecodeSignal(signal)) {
              return;
            }

            const message = mapScannerErrorMessage(error, translationRef.current);
            if (message.trim().length === 0) {
              return;
            }

            if (isFatalScannerSignal(signal)) {
              logScannerEvent("scan_fatal_error", {
                message
              });
              reportScannerError(message);
              stopScannerControls(controlsRef.current);
              cleanupQrScannerVideo(videoElement);
              setIsRetrying(false);
              return;
            }

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
          },
          onAttemptFailure: ({ attempt, error }): void => {
            logScannerEvent("start_attempt_failed", {
              attempt: attempt.name,
              message: mapScannerErrorMessage(error, translationRef.current)
            });
          }
        });

        if (isSessionCancelled()) {
          scannerStartResult.controls.stop();
          cleanupQrScannerVideo(videoElement);
          return;
        }

        controlsRef.current = scannerStartResult.controls;
        logScannerEvent("start_attempt_succeeded", {
          attempt: scannerStartResult.attempt.name
        });
      } catch (error) {
        const mappedMessage = mapScannerErrorMessage(error, translationRef.current);
        logScannerEvent("start_failed", {
          message: mappedMessage
        });
        stopScannerControls(controlsRef.current);
        cleanupQrScannerVideo(videoElement);
        setIsRetrying(false);
        reportScannerError(mappedMessage);
      }
    };

    void startScanner();

    return (): void => {
      isCancelled = true;
      window.clearTimeout(startupTimeoutId);
      videoElement.removeEventListener("playing", handleVideoSignal);
      videoElement.removeEventListener("loadedmetadata", handleVideoSignal);
      videoElement.removeEventListener("canplay", handleVideoSignal);
      logScannerEvent("cleanup");
      stopScannerControls(controlsRef.current);
      controlsRef.current = null;
      cleanupQrScannerVideo(videoElement);
    };
  }, [isActive, retryToken]);

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
        <div className="qr-scanner-viewport" data-state={scannerState}>
          <video className="qr-scanner-video" ref={videoRef} muted playsInline autoPlay />
          {scannerState === "starting" ? (
            <div className="qr-scanner-status qr-scanner-status--starting" role="status">
              <span className="qr-scanner-spinner" aria-hidden="true" />
              <p className="qr-scanner-status-title">
                {isRetrying ? t("qrScanner.retrying") : t("qrScanner.starting")}
              </p>
            </div>
          ) : null}
          {scannerState === "error" ? (
            <div className="qr-scanner-status qr-scanner-status--error" role="alert">
              <p className="qr-scanner-status-title">
                {scannerErrorMessage ?? t("qrScanner.startFailed")}
              </p>
              <div className="qr-scanner-status-actions">
                <button type="button" className="quest-button" onClick={requestRetry}>
                  {t("qrScanner.retry")}
                </button>
                <button
                  type="button"
                  className="quest-button quest-button--ghost"
                  onClick={requestClose}
                >
                  {t("qrScanner.close")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>,
    document.body
  );
}
