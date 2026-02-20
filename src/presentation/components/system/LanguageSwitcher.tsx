import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import type { AppLanguage } from "@/presentation/i18n/language.types";

function HungaryFlag(): JSX.Element {
  return (
    <svg
      className="language-flag-svg"
      viewBox="0 0 60 40"
      role="img"
      aria-hidden="true"
    >
      <rect width="60" height="40" fill="#ffffff" />
      <rect width="60" height="13.3333" y="0" fill="#ce2939" />
      <rect width="60" height="13.3333" y="26.6667" fill="#477050" />
    </svg>
  );
}

function UnitedKingdomFlag(): JSX.Element {
  return (
    <svg
      className="language-flag-svg"
      viewBox="0 0 60 40"
      role="img"
      aria-hidden="true"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="10" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" strokeWidth="6" />
      <rect x="25" width="10" height="40" fill="#ffffff" />
      <rect y="15" width="60" height="10" fill="#ffffff" />
      <rect x="27" width="6" height="40" fill="#c8102e" />
      <rect y="17" width="60" height="6" fill="#c8102e" />
    </svg>
  );
}

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const { play, unlock } = useSound();
  const nextLanguage: AppLanguage = language === "hu" ? "en" : "hu";

  const toggleLanguage = (): void => {
    unlock();
    const selectedLanguage: AppLanguage = nextLanguage;
    play(selectedLanguage === "hu" ? "language_hu" : "language_en");
    setLanguage(selectedLanguage);
  };

  return (
    <section className="language-switcher" aria-label={t("language.switcherAriaLabel")}>
      <button
        type="button"
        className="language-switcher-toggle"
        onClick={toggleLanguage}
        aria-label={
          nextLanguage === "hu"
            ? t("language.switchToHu")
            : t("language.switchToEn")
        }
        title={
          nextLanguage === "hu"
            ? t("language.switchToHu")
            : t("language.switchToEn")
        }
      >
        <span className="language-switcher-flag">
          {language === "hu" ? <HungaryFlag /> : <UnitedKingdomFlag />}
        </span>
        <span className="language-switcher-code">
          {language === "hu" ? t("language.hu") : t("language.en")}
        </span>
      </button>
    </section>
  );
}
