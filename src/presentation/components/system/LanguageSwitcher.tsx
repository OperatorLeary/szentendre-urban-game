import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import type { AppLanguage } from "@/presentation/i18n/language.types";

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const { play, unlock } = useSound();

  const setSelectedLanguage = (selectedLanguage: AppLanguage): void => {
    if (selectedLanguage === language) {
      return;
    }

    unlock();
    play("tap");
    setLanguage(selectedLanguage);
  };

  return (
    <section
      className="language-switcher"
      role="group"
      aria-label={t("language.switcherAriaLabel")}
    >
      <span className="language-switcher-label">{t("language.label")}</span>
      <button
        type="button"
        className={`language-switcher-button ${
          language === "hu" ? "language-switcher-button--active" : ""
        }`}
        onClick={(): void => {
          setSelectedLanguage("hu");
        }}
      >
        {t("language.hu")}
      </button>
      <button
        type="button"
        className={`language-switcher-button ${
          language === "en" ? "language-switcher-button--active" : ""
        }`}
        onClick={(): void => {
          setSelectedLanguage("en");
        }}
      >
        {t("language.en")}
      </button>
    </section>
  );
}
