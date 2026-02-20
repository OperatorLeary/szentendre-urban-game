import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { useTheme, type ThemeMode } from "@/presentation/app/ThemeContext";

const THEME_OPTIONS: readonly ThemeMode[] = ["light", "dark", "auto"];

export function ThemeSwitcher(): JSX.Element {
  const { t } = useLanguage();
  const { mode, setMode } = useTheme();
  const { play, unlock } = useSound();

  const handleThemeSelection = (selectedMode: ThemeMode): void => {
    if (selectedMode === mode) {
      return;
    }

    unlock();
    play("tap");
    setMode(selectedMode);
  };

  return (
    <section
      className="theme-switcher"
      role="group"
      aria-label={t("theme.switcherAriaLabel")}
    >
      <span className="theme-switcher-label">{t("theme.label")}</span>
      {THEME_OPTIONS.map((themeOption: ThemeMode): JSX.Element => (
        <button
          key={themeOption}
          type="button"
          className={`theme-switcher-button ${
            mode === themeOption ? "theme-switcher-button--active" : ""
          }`}
          onClick={(): void => {
            handleThemeSelection(themeOption);
          }}
        >
          {t(`theme.${themeOption}`)}
        </button>
      ))}
    </section>
  );
}
