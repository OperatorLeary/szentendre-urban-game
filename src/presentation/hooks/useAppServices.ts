import { useContext } from "react";

import type { AppServices } from "@/application/contracts/app-services.contract";
import { ServicesContext } from "@/presentation/app/ServicesContext";
import { assertNonNull } from "@/shared/utils/assert";

export function useAppServices(): AppServices {
  const services: AppServices | null = useContext(ServicesContext);

  assertNonNull(
    services,
    "AppServices context is missing. Ensure ServicesProvider is mounted."
  );

  return services;
}
