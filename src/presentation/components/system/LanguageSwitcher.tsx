import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import type { AppLanguage } from "@/presentation/i18n/language.types";

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage, t } = useLanguage();

  const setSelectedLanguage = (selectedLanguage: AppLanguage): void => {
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
