import type { ClockPort } from "@/application/ports/clock.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import type { Run } from "@/core/entities/run.entity";
import { ApplicationError } from "@/core/errors/app-error";

export type AbandonActiveRunRequest = Record<string, never>;

export interface AbandonActiveRunResponse {
  readonly run: Run;
}

interface AbandonActiveRunDependencies {
  readonly runRepository: RunRepositoryPort;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

export class AbandonActiveRunUseCase
  implements UseCase<AbandonActiveRunRequest, Promise<AbandonActiveRunResponse>>
{
  public constructor(
    private readonly dependencies: AbandonActiveRunDependencies
  ) {}

  public async execute(
    request: AbandonActiveRunRequest
  ): Promise<AbandonActiveRunResponse> {
    void request;
    const run: Run | null =
      await this.dependencies.runRepository.findActiveForCurrentDevice();

    if (run === null) {
      throw new ApplicationError("No active run found for this device.");
    }

    const abandonedRun: Run = run.abandon(this.dependencies.clock.now());
    const persistedRun: Run =
      await this.dependencies.runRepository.update(abandonedRun);

    this.dependencies.logger.info("Active run abandoned by player.", {
      runId: persistedRun.id,
      routeId: persistedRun.routeId
    });

    return {
      run: persistedRun
    };
  }
}

