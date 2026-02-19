import { useEffect, useRef, type JSX } from "react";

interface QrScannerPanelProps {
  readonly isActive: boolean;
  readonly onDetected: (payload: string) => void;
  readonly onError: (message: string) => void;
}

interface ReaderControls {
  stop: () => void;
}

export function QrScannerPanel({
  isActive,
  onDetected,
  onError
}: QrScannerPanelProps): JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect((): (() => void) | void => {
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

            if (result !== undefined && result !== null) {
              onDetected(result.getText());
              controls?.stop();
              return;
            }

            if (error !== undefined && error !== null) {
              const message = error.message ?? "";
              if (message.length > 0 && !message.includes("NotFoundException")) {
                onError(message);
              }
            }
          }
        )) as ReaderControls;
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to start QR scanner.");
      }
    };

    void startScanner();

    return (): void => {
      isCancelled = true;
      controls?.stop();
    };
  }, [isActive, onDetected, onError]);

  if (!isActive) {
    return null;
  }

  return (
    <section className="qr-scanner-panel">
      <video className="qr-scanner-video" ref={videoRef} muted playsInline />
    </section>
  );
}
