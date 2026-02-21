import { useEffect, useRef, type JSX } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";

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

  useDialogA11y({
    isOpen: isActive,
    containerRef: frameRef,
    onRequestClose: onClose
  });

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let controls: ReaderControls | null = null;
    let isCancelled = false;

    const startScanner = async (): Promise<void> => {
      try {
        const module = await import("@zxing/browser");
        const reader = new module.BrowserQRCodeReader();

        const videoElement = videoRef.current;
        if (videoElement === null || isCancelled) {
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
              onDetected(result.getText());
              controls?.stop();
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
                onError(message);
              }
            }
          }
        )) as ReaderControls;
      } catch (error) {
        onError(mapScannerErrorMessage(error, t));
      }
    };

    void startScanner();

    return (): void => {
      isCancelled = true;
      controls?.stop();
    };
  }, [isActive, onDetected, onError, t]);

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
          onClose();
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
            onClick={onClose}
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
