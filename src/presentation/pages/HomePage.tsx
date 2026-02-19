import { useEffect, type JSX } from "react";

import { useAppServices } from "@/presentation/hooks/useAppServices";
import { APP_NAME } from "@/shared/constants/app.constants";

function HomePage(): JSX.Element {
  const { logger } = useAppServices();

  useEffect((): void => {
    logger.info("Home page rendered.");
  }, [logger]);

  return (
    <main className="app-shell">
      <section className="app-card">
        <h1 className="app-title">{APP_NAME}</h1>
        <p className="app-copy">
          Phase 2 architecture skeleton is active with Clean Architecture
          layering, provider composition, and routing.
        </p>
      </section>
    </main>
  );
}

export default HomePage;
