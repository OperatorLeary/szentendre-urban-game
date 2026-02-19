import { useEffect, useState, type JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    readonly outcome: "accepted" | "dismissed";
    readonly platform: string;
  }>;
}

export function InstallPromptButton(): JSX.Element | null {
  const { t } = useLanguage();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect((): (() => void) => {
    const handler = (event: Event): void => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return (): void => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (installEvent === null) {
    return null;
  }

  return (
    <button
      type="button"
      className="install-button"
      onClick={async (): Promise<void> => {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      }}
    >
      {t("install.button")}
    </button>
  );
}
