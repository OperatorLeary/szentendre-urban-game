import type { AppServices } from "@/application/contracts/app-services.contract";
import { ConsoleLoggerAdapter } from "@/infrastructure/logging/console-logger.adapter";

let cachedServices: AppServices | null = null;

export function createAppServices(): AppServices {
  if (cachedServices !== null) {
    return cachedServices;
  }

  cachedServices = Object.freeze({
    logger: new ConsoleLoggerAdapter()
  });

  return cachedServices;
}
