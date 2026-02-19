import type { JSX } from "react";
import { BrowserRouter } from "react-router-dom";

import type { AppServices } from "@/application/contracts/app-services.contract";
import AppProviders from "@/presentation/app/AppProviders";
import AppRouter from "@/presentation/app/AppRouter";

interface AppProps {
  readonly services: AppServices;
}

export function App({ services }: AppProps): JSX.Element {
  return (
    <AppProviders services={services}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}
