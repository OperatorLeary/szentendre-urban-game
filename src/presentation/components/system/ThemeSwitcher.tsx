import { useRef, type JSX, type KeyboardEvent } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { useTheme, type ThemeMode } from "@/presentation/app/ThemeContext";

const THEME_OPTIONS: readonly ThemeMode[] = ["light", "dark", "auto"];

export function ThemeSwitcher(): JSX.Element {
  const { t } = useLanguage();
  const { mode, setMode } = useTheme();
  const { play, unlock } = useSound();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleThemeSelection = (selectedMode: ThemeMode): void => {
    if (selectedMode === mode) {
      return;
    }

    unlock();
    play("tap");
    setMode(selectedMode);
  };

  const handleThemeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction: number = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex: number =
      (index + direction + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    const nextMode: ThemeMode = THEME_OPTIONS[nextIndex] ?? mode;
    handleThemeSelection(nextMode);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      className="theme-switcher"
      role="radiogroup"
      aria-label={t("theme.switcherAriaLabel")}
    >
      <span className="theme-switcher-label">{t("theme.label")}</span>
      {THEME_OPTIONS.map((themeOption: ThemeMode, index: number): JSX.Element => (
        <button
          key={themeOption}
          ref={(element): void => {
            buttonRefs.current[index] = element;
          }}
          type="button"
          role="radio"
          aria-checked={mode === themeOption}
          tabIndex={mode === themeOption ? 0 : -1}
          className={`theme-switcher-button ${
            mode === themeOption ? "theme-switcher-button--active" : ""
          }`}
          onKeyDown={(event): void => {
            handleThemeKeyDown(event, index);
          }}
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
