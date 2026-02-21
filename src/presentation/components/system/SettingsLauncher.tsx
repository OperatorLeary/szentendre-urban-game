import { useCallback, useRef, useState, type JSX, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { SoundToggleButton } from "@/presentation/components/system/SoundToggleButton";
import { ThemeSwitcher } from "@/presentation/components/system/ThemeSwitcher";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";

export function SettingsLauncher(): JSX.Element {
  const { t } = useLanguage();
  const { play, unlock } = useSound();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closeSettings = useCallback((): void => {
    setIsOpen(false);
    unlock();
    play("tap");
  }, [play, unlock]);

  const openSettings = useCallback((): void => {
    setIsOpen(true);
    unlock();
    play("tap");
  }, [play, unlock]);

  const toggleSettings = useCallback((): void => {
    if (isOpen) {
      closeSettings();
      return;
    }

    openSettings();
  }, [closeSettings, isOpen, openSettings]);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      closeSettings();
    }
  };

  useDialogA11y({
    isOpen,
    containerRef: panelRef,
    onRequestClose: closeSettings
  });

  return (
    <>
      <button
        type="button"
        className={`settings-launcher ${isOpen ? "settings-launcher--open" : ""}`}
        aria-label={isOpen ? t("settings.closeAriaLabel") : t("settings.openAriaLabel")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="settings-panel-dialog"
        onClick={toggleSettings}
      >
        <span className="settings-gear-icon" aria-hidden="true">
          <span className="settings-gear-ring settings-gear-ring--outer" />
          <span className="settings-gear-ring settings-gear-ring--inner" />
          <span className="settings-gear-core" />
        </span>
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="settings-overlay" onClick={handleOverlayClick}>
              <div
                ref={panelRef}
                id="settings-panel-dialog"
                className="settings-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-panel-title"
                tabIndex={-1}
              >
                <header className="settings-panel-header">
                  <h2 id="settings-panel-title" className="settings-panel-title">
                    {t("settings.title")}
                  </h2>
                </header>
                <p className="settings-panel-copy">{t("settings.copy")}</p>
                <div className="settings-panel-controls">
                  <ThemeSwitcher />
                  <SoundToggleButton />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
