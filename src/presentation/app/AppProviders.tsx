import type { ErrorInfo, JSX, ReactNode } from "react";

import type { AppServices } from "@/application/contracts/app-services.contract";
import { LanguageProvider } from "@/presentation/app/LanguageContext";
import { QuestRuntimeProvider } from "@/presentation/app/QuestRuntimeContext";
import { ServicesProvider } from "@/presentation/app/ServicesContext";
import { SoundProvider } from "@/presentation/app/SoundContext";
import { ThemeProvider } from "@/presentation/app/ThemeContext";
import { GlobalErrorBoundary } from "@/presentation/components/system/GlobalErrorBoundary";

interface AppProvidersProps {
  readonly children: ReactNode;
  readonly services: AppServices;
}

function AppProviders({ children, services }: AppProvidersProps): JSX.Element {
  const handleError = (error: Error, errorInfo: ErrorInfo): void => {
    services.logger.error("Unhandled presentation error captured.", {
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      stack: error.stack
    });
  };

  return (
    <ServicesProvider services={services}>
      <LanguageProvider>
        <ThemeProvider>
          <SoundProvider>
            <QuestRuntimeProvider>
              <GlobalErrorBoundary onError={handleError}>{children}</GlobalErrorBoundary>
            </QuestRuntimeProvider>
          </SoundProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ServicesProvider>
  );
}

export default AppProviders;
