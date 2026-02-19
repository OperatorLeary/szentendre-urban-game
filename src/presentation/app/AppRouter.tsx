import { Suspense, lazy, type JSX } from "react";
import { Route, Routes } from "react-router-dom";

import RouteFallback from "@/presentation/components/system/RouteFallback";
import { ROUTES } from "@/shared/config/routes";

const HomePage = lazy(async () => import("@/presentation/pages/HomePage"));
const NotFoundPage = lazy(
  async () => import("@/presentation/pages/NotFoundPage")
);

function AppRouter(): JSX.Element {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
