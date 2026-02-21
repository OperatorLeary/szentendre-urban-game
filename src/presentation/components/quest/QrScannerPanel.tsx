import { useEffect, useRef, type JSX } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";

interface QrScannerPanelProps {
  readonly isActive: boolean;
  readonly onDetected: (payload: string) => void;
  readonly onError: (message: string) => void;
  readonly onClose: () => void;
}

interface ReaderControls {
  stop: () => void;
}

export function QrScannerPanel({
  isActive,
  onDetected,
  onError,
  onClose
}: QrScannerPanelProps): JSX.Element | null {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
              const message = error.message;
              if (message.length > 0 && !message.includes("NotFoundException")) {
                onError(message);
              }
            }
          }
        )) as ReaderControls;
      } catch (error) {
        onError(error instanceof Error ? error.message : t("qrScanner.startFailed"));
      }
    };

    void startScanner();

    return (): void => {
      isCancelled = true;
      controls?.stop();
    };
  }, [isActive, onDetected, onError, t]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return (): void => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isActive, onClose]);

  if (!isActive) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <section className="qr-scanner-overlay" role="dialog" aria-modal="true">
      <div className="qr-scanner-frame">
        <div className="qr-scanner-toolbar">
          <p className="qr-scanner-hint">{t("qrScanner.overlayHint")}</p>
          <button
            type="button"
            className="quest-button quest-button--ghost qr-scanner-close"
            onClick={onClose}
          >
            {t("qrScanner.close")}
          </button>
        </div>
        <video className="qr-scanner-video" ref={videoRef} muted playsInline />
      </div>
    </section>,
    document.body
  );
}
