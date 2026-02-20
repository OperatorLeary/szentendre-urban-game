import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom";

import { useSound } from "@/presentation/app/SoundContext";
import { BugReportFloatingButton } from "@/presentation/components/bug-report/BugReportFloatingButton";
import { IntroSplash } from "@/presentation/components/system/IntroSplash";
import { InstallPromptButton } from "@/presentation/components/system/InstallPromptButton";
import { LanguageSwitcher } from "@/presentation/components/system/LanguageSwitcher";
import { SoundToggleButton } from "@/presentation/components/system/SoundToggleButton";
import RouteFallback from "@/presentation/components/system/RouteFallback";
import { ROUTES } from "@/shared/config/routes";

const HomePage = lazy(async () => import("@/presentation/pages/HomePage"));
const QuestLocationPage = lazy(
  async () => import("@/presentation/pages/QuestLocationPage")
);
const NotFoundPage = lazy(
  async () => import("@/presentation/pages/NotFoundPage")
);

const INTRO_SPLASH_SESSION_KEY = "szentendre-city-quest-intro-shown";

function AppRouter(): JSX.Element {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { play } = useSound();
  const previousPathnameRef = useRef<string | null>(null);
  const [isIntroVisible, setIsIntroVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(INTRO_SPLASH_SESSION_KEY) !== "1";
  });

  useEffect((): void => {
    const previousPathname: string | null = previousPathnameRef.current;
    if (previousPathname !== null && previousPathname !== location.pathname) {
      play("transition");
    }

    previousPathnameRef.current = location.pathname;
  }, [location.pathname, play]);

  const routeStageClassName =
    navigationType === "POP"
      ? "route-stage route-stage--back"
      : "route-stage route-stage--forward";

  const handleIntroComplete = useCallback((): void => {
    setIsIntroVisible(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(INTRO_SPLASH_SESSION_KEY, "1");
    }
  }, []);

  return (
    <>
      <IntroSplash isVisible={isIntroVisible} onComplete={handleIntroComplete} />
      <div className="top-controls">
        <LanguageSwitcher />
        <SoundToggleButton />
      </div>
      <InstallPromptButton />
      <BugReportFloatingButton />
      <Suspense fallback={<RouteFallback />}>
        <div className={routeStageClassName} key={location.pathname}>
          <Routes location={location}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.routeLocation} element={<QuestLocationPage />} />
            <Route path={ROUTES.notFound} element={<NotFoundPage />} />
          </Routes>
        </div>
      </Suspense>
    </>
  );
}

export default AppRouter;
