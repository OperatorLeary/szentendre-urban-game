import type { JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";

function RouteFallback(): JSX.Element {
  const { t } = useLanguage();

  return (
    <div className="system-message" role="status" aria-live="polite">
      {t("routeFallback.loading")}
    </div>
  );
}

export default RouteFallback;
