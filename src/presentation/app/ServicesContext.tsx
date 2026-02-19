import { createContext, type JSX, type ReactNode } from "react";

import type { AppServices } from "@/application/contracts/app-services.contract";

interface ServicesProviderProps {
  readonly children: ReactNode;
  readonly services: AppServices;
}

export const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  children,
  services
}: ServicesProviderProps): JSX.Element {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}
