import { useEffect, type JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";

interface IntroSplashProps {
  readonly isVisible: boolean;
  readonly onComplete: () => void;
}

const SPLASH_DURATION_MS = 850;

export function IntroSplash({ isVisible, onComplete }: IntroSplashProps): JSX.Element | null {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    const timeoutId = window.setTimeout((): void => {
      onComplete();
    }, SPLASH_DURATION_MS);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <section className="intro-splash" aria-hidden="true" onPointerDown={onComplete}>
      <div className="intro-splash__mark">
        <span className="intro-splash__dot" />
      </div>
      <p className="intro-splash__title">{t("app.name")}</p>
    </section>
  );
}
