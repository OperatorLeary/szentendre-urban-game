import type { JSX } from "react";
import { Link } from "react-router-dom";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { ROUTES } from "@/shared/config/routes";

function NotFoundPage(): JSX.Element {
  const { t } = useLanguage();

  return (
    <main className="quest-shell">
      <section className="quest-panel">
        <h1 className="quest-panel-title">{t("notFound.title")}</h1>
        <p className="quest-copy">{t("notFound.copy")}</p>
        <Link className="app-link" to={ROUTES.home}>
          {t("notFound.returnHome")}
        </Link>
      </section>
    </main>
  );
}

export default NotFoundPage;
