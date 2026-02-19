import type { JSX } from "react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/shared/config/routes";

function NotFoundPage(): JSX.Element {
  return (
    <main className="app-shell">
      <section className="app-card">
        <h1 className="app-title">Page not found</h1>
        <p className="app-copy">
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
