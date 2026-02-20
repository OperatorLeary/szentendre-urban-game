import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";

export function SoundToggleButton(): JSX.Element {
  const { t } = useLanguage();
  const { isEnabled, play, toggleEnabled, unlock } = useSound();

  const handleToggle = (): void => {
    unlock();

    if (isEnabled) {
      play("tap");
    }

    toggleEnabled();
  };

  return (
    <button
      type="button"
      className={`sound-toggle-button ${
        isEnabled ? "sound-toggle-button--active" : ""
      }`}
      aria-label={t("sound.toggleAriaLabel")}
      onClick={handleToggle}
    >
      <span className="sound-toggle-button__prefix">{t("sound.label")}</span>
      <span className="sound-toggle-button__state">
        {isEnabled ? t("sound.on") : t("sound.off")}
      </span>
    </button>
  );
}

