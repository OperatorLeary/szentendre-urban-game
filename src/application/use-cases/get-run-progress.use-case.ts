import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import type { Checkin } from "@/core/entities/checkin.entity";
import type { Location } from "@/core/entities/location.entity";
import type { Run } from "@/core/entities/run.entity";
import { ApplicationError } from "@/core/errors/app-error";
import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import { GameSessionService } from "@/core/services/game-session.service";
import type { RunId } from "@/core/types/identifiers.type";

export interface GetRunProgressRequest {
  readonly runId: RunId;
}

export type GetRunProgressResponse = GameSessionSnapshot;

interface GetRunProgressDependencies {
  readonly runRepository: RunRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
  readonly checkinRepository: CheckinRepositoryPort;
  readonly gameSessionService: GameSessionService;
  readonly logger: LoggerPort;
}

export class GetRunProgressUseCase
  implements UseCase<GetRunProgressRequest, Promise<GetRunProgressResponse>>
{
  public constructor(private readonly dependencies: GetRunProgressDependencies) {}

  public async execute(
    request: GetRunProgressRequest
  ): Promise<GetRunProgressResponse> {
    const run: Run | null = await this.dependencies.runRepository.findById(
      request.runId
    );

    if (run === null) {
      throw new ApplicationError("Run not found.", {
        context: {
          runId: request.runId
        }
      });
    }

    const [locations, checkins]: readonly [readonly Location[], readonly Checkin[]] =
      await Promise.all([
        this.dependencies.locationRepository.listByRoute(run.routeId),
        this.dependencies.checkinRepository.listByRunId(run.id)
      ]);

    const snapshot: GameSessionSnapshot = this.dependencies.gameSessionService.buildSnapshot(
      {
        run,
        locations,
        checkins
      }
    );

    this.dependencies.logger.debug("Run progress loaded.", {
      runId: run.id,
      completedLocations: snapshot.completedLocations,
      totalLocations: snapshot.totalLocations,
      currentSequenceIndex: snapshot.currentSequenceIndex
    });

    return snapshot;
  }
}
