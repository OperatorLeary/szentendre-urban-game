import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { Checkin } from "@/core/entities/checkin.entity";
import type { Location } from "@/core/entities/location.entity";
import type { Run } from "@/core/entities/run.entity";
import { ApplicationError } from "@/core/errors/app-error";
import type { LocationId, RunId } from "@/core/types/identifiers.type";

export interface CheckinContextRequest {
  readonly runId: RunId;
  readonly locationId: LocationId;
}

export interface CheckinContext {
  readonly run: Run;
  readonly location: Location;
  readonly locations: readonly Location[];
  readonly checkins: readonly Checkin[];
}

interface CheckinContextLoaderDependencies {
  readonly runRepository: RunRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
  readonly checkinRepository: CheckinRepositoryPort;
}

export class CheckinContextLoaderService {
  public constructor(
    private readonly dependencies: CheckinContextLoaderDependencies
  ) {}

  public async load(request: CheckinContextRequest): Promise<CheckinContext> {
    const run: Run | null = await this.dependencies.runRepository.findById(
      request.runId
    );
    if (run === null) {
      throw new ApplicationError("Run not found for check-in.", {
        context: {
          runId: request.runId
        }
      });
    }

    const location: Location | null = await this.dependencies.locationRepository.findById(
      request.locationId
    );
    if (location === null) {
      throw new ApplicationError("Location not found for check-in.", {
        context: {
          locationId: request.locationId
        }
      });
    }

    const [locations, checkins]: readonly [readonly Location[], readonly Checkin[]] =
      await Promise.all([
        this.dependencies.locationRepository.listActiveLocations(),
        this.dependencies.checkinRepository.listByRunId(run.id)
      ]);

    return {
      run,
      location,
      locations,
      checkins
    };
  }
}
