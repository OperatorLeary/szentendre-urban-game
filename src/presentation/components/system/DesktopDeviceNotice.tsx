import { useEffect, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";

const DESKTOP_NOTICE_DISMISSED_KEY = "szentendre-city-quest-desktop-notice-dismissed";

interface DesktopDeviceNoticeProps {
  readonly isSuppressed?: boolean;
}

function isLikelyHandheldDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  const userAgent: string = navigator.userAgent.toLowerCase();
  const isIpadDesktopMode: boolean =
    userAgent.includes("macintosh") && navigator.maxTouchPoints > 1;
  const isMobileUserAgent: boolean = /android|iphone|ipod|mobile|blackberry|iemobile|opera mini|windows phone/.test(
    userAgent
  );
  const isTabletUserAgent: boolean = /ipad|tablet|kindle|silk|playbook|sm-t|tab/.test(
    userAgent
  );
  const hasCoarsePointer: boolean = window.matchMedia("(pointer: coarse)").matches;
  const isSmallViewport: boolean = window.matchMedia("(max-width: 64rem)").matches;

  return (
    isIpadDesktopMode ||
    isMobileUserAgent ||
    isTabletUserAgent ||
    (hasCoarsePointer && isSmallViewport)
  );
}

function shouldShowNotice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (window.localStorage.getItem(DESKTOP_NOTICE_DISMISSED_KEY) === "1") {
      return false;
    }
  } catch {
    return false;
  }

  return !isLikelyHandheldDevice();
}

export function DesktopDeviceNotice(props: DesktopDeviceNoticeProps): JSX.Element | null {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (props.isSuppressed === true || typeof window === "undefined") {
      setIsVisible(false);
      return;
    }

    const updateVisibility = (): void => {
      setIsVisible(shouldShowNotice());
    };

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    return (): void => {
      window.removeEventListener("resize", updateVisibility);
    };
  }, [props.isSuppressed]);

  const dismissNotice = (): void => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DESKTOP_NOTICE_DISMISSED_KEY, "1");
      } catch {
        // Ignore storage failures and just close the notice for this render.
      }
    }

    setIsVisible(false);
  };

  useDialogA11y({
    isOpen: isVisible,
    containerRef: sheetRef,
    onRequestClose: dismissNotice
  });

  if (!isVisible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <section
      className="desktop-device-notice-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-device-notice-title"
      aria-describedby="desktop-device-notice-copy"
      onMouseDown={(event): void => {
        if (event.target === event.currentTarget) {
          dismissNotice();
        }
      }}
    >
      <div className="desktop-device-notice-sheet" ref={sheetRef} tabIndex={-1}>
        <button
          type="button"
          className="desktop-device-notice-close"
          onClick={dismissNotice}
          aria-label={t("desktopNotice.close")}
        >
          x
        </button>
        <h2 id="desktop-device-notice-title" className="desktop-device-notice-title">
          {t("desktopNotice.title")}
        </h2>
        <p className="desktop-device-notice-copy" id="desktop-device-notice-copy">
          {t("desktopNotice.copy")}
        </p>
        <div className="desktop-device-notice-actions">
          <button type="button" className="quest-button" onClick={dismissNotice}>
            {t("desktopNotice.continueHere")}
          </button>
        </div>
      </div>
    </section>,
    document.body
  );
}
