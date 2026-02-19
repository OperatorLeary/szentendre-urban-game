import type { ErrorInfo, JSX, ReactNode } from "react";

import type { AppServices } from "@/application/contracts/app-services.contract";
import { ServicesProvider } from "@/presentation/app/ServicesContext";
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
      <GlobalErrorBoundary onError={handleError}>{children}</GlobalErrorBoundary>
    </ServicesProvider>
  );
}

export default AppProviders;
