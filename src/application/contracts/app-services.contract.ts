import type { LoggerPort } from "@/application/ports/logger.port";

export interface AppServices {
  readonly logger: LoggerPort;
}
