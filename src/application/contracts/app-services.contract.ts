import type { GameUseCases } from "@/application/contracts/game-use-cases.contract";
import type { LoggerPort } from "@/application/ports/logger.port";

export interface AppServices {
  readonly logger: LoggerPort;
  readonly gameUseCases: GameUseCases;
}
