import { Suspense, lazy, type JSX } from "react";
import { Route, Routes } from "react-router-dom";

import { BugReportFloatingButton } from "@/presentation/components/bug-report/BugReportFloatingButton";
import { InstallPromptButton } from "@/presentation/components/system/InstallPromptButton";
import RouteFallback from "@/presentation/components/system/RouteFallback";
import { ROUTES } from "@/shared/config/routes";

const HomePage = lazy(async () => import("@/presentation/pages/HomePage"));
const QuestLocationPage = lazy(
  async () => import("@/presentation/pages/QuestLocationPage")
);
const NotFoundPage = lazy(
  async () => import("@/presentation/pages/NotFoundPage")
);

function AppRouter(): JSX.Element {
  return (
    <>
      <InstallPromptButton />
      <BugReportFloatingButton />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.routeLocation} element={<QuestLocationPage />} />
          <Route path={ROUTES.notFound} element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default AppRouter;
