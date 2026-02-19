import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { createAppServices } from "@/infrastructure/di/create-app-services";
import { App } from "@/presentation/app/App";
import "@/styles/global.css";

const rootElement: HTMLElement | null = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root container '#root' was not found in index.html.");
}

const appServices = createAppServices();

registerSW({
  immediate: true
});

createRoot(rootElement).render(
  <StrictMode>
    <App services={appServices} />
  </StrictMode>
);
