import type { ClockPort } from "@/application/ports/clock.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import { ApplicationError } from "@/core/errors/app-error";
import { RunStatus } from "@/core/enums/run-status.enum";
import { Run } from "@/core/entities/run.entity";
import type { RunId } from "@/core/types/identifiers.type";

export interface StartRunRequest {
  readonly runId: RunId;
  readonly playerAlias: string;
  readonly startedAt?: Date;
}

export type StartRunResponse = Run;

interface StartRunDependencies {
  readonly runRepository: RunRepositoryPort;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

export class StartRunUseCase
  implements UseCase<StartRunRequest, Promise<StartRunResponse>>
{
  public constructor(private readonly dependencies: StartRunDependencies) {}

  public async execute(request: StartRunRequest): Promise<StartRunResponse> {
    const existingRun: Run | null = await this.dependencies.runRepository.findById(
      request.runId
    );

    if (existingRun !== null) {
      throw new ApplicationError("Cannot start run with duplicate runId.", {
        context: {
          runId: request.runId
        }
      });
    }

    const startedAt: Date = request.startedAt ?? this.dependencies.clock.now();
    const run = new Run({
      id: request.runId,
      playerAlias: request.playerAlias,
      status: RunStatus.Active,
      startedAt,
      completedAt: null
    });

    const persistedRun: Run = await this.dependencies.runRepository.create(run);

    this.dependencies.logger.info("Run started.", {
      runId: persistedRun.id,
      startedAt: persistedRun.startedAt.toISOString()
    });

    return persistedRun;
  }
}
