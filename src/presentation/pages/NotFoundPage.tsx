import type { JSX } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/config/routes";

function NotFoundPage(): JSX.Element {
  return (
    <main className="quest-shell">
      <section className="quest-panel">
        <h1 className="quest-panel-title">Page not found</h1>
        <p className="quest-copy">
          The route does not exist in the current quest application.
        </p>
        <Link className="app-link" to={ROUTES.home}>
          Return to home
        </Link>
      </section>
    </main>
  );
}

export default NotFoundPage;
