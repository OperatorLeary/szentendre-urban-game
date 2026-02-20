import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { ClockPort } from "@/application/ports/clock.port";
import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import type { Checkin } from "@/core/entities/checkin.entity";
import type { Location } from "@/core/entities/location.entity";
import type { Route } from "@/core/entities/route.entity";
import { Run } from "@/core/entities/run.entity";
import { ApplicationError } from "@/core/errors/app-error";
import { APP_ERROR_CODES } from "@/core/errors/error-codes";
import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import { GameSessionService } from "@/core/services/game-session.service";
import { RunStatus } from "@/core/enums/run-status.enum";
import { toRunId } from "@/core/types/identifiers.type";

export interface EnsureRunSessionRequest {
  readonly routeSlug: string;
  readonly locationSlug: string;
  readonly playerAlias: string;
}

export interface EnsureRunSessionResponse {
  readonly run: Run;
  readonly route: Route;
  readonly locations: readonly Location[];
  readonly requestedLocation: Location;
  readonly session: GameSessionSnapshot;
}

interface EnsureRunSessionDependencies {
  readonly runRepository: RunRepositoryPort;
  readonly routeRepository: RouteRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
  readonly checkinRepository: CheckinRepositoryPort;
  readonly gameSessionService: GameSessionService;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

function generateRunIdentifier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class EnsureRunSessionUseCase
  implements UseCase<EnsureRunSessionRequest, Promise<EnsureRunSessionResponse>>
{
  public constructor(private readonly dependencies: EnsureRunSessionDependencies) {}

  public async execute(
    request: EnsureRunSessionRequest
  ): Promise<EnsureRunSessionResponse> {
    const route: Route | null = await this.dependencies.routeRepository.findActiveBySlug(
      request.routeSlug
    );
    if (route === null) {
      throw new ApplicationError("Requested route is not active.", {
        context: {
          routeSlug: request.routeSlug
        }
      });
    }

    const requestedLocation: Location | null =
      await this.dependencies.locationRepository.findBySlug(
        route.id,
        request.locationSlug
      );
    if (requestedLocation === null) {
      throw new ApplicationError("Requested location is not active on this route.", {
        context: {
          routeSlug: request.routeSlug,
          locationSlug: request.locationSlug
        }
      });
    }

    let run: Run | null = await this.dependencies.runRepository.findActiveForCurrentDevice();
    if (run === null) {
      run = await this.dependencies.runRepository.create(
        new Run({
          id: toRunId(generateRunIdentifier()),
          routeId: route.id,
          playerAlias: request.playerAlias,
          startLocationId: requestedLocation.id,
          currentSequenceIndex: requestedLocation.sequenceNumber,
          status: RunStatus.Active,
          startedAt: this.dependencies.clock.now(),
          completedAt: null
        })
      );

      this.dependencies.logger.info("New run created from route session request.", {
        runId: run.id,
        routeSlug: route.slug,
        startLocationSlug: requestedLocation.slug
      });
    }

    if (run.routeId !== route.id) {
      const activeRoute: Route | null = await this.dependencies.routeRepository.findById(
        run.routeId
      );
      const activeLocations: readonly Location[] =
        await this.dependencies.locationRepository.listByRoute(run.routeId);
      const activeCheckins: readonly Checkin[] =
        await this.dependencies.checkinRepository.listByRunId(run.id);
      const activeSession: GameSessionSnapshot =
        this.dependencies.gameSessionService.buildSnapshot({
          run,
          locations: activeLocations,
          checkins: activeCheckins
        });

      throw new ApplicationError("An active run already exists on another route.", {
        errorCode: APP_ERROR_CODES.activeRunConflictOtherRoute,
        context: {
          activeRouteSlug: activeRoute?.slug ?? null,
          activeNextLocationSlug: activeSession.nextLocation?.slug ?? null
        }
      });
    }

    const [locations, checkins] = await Promise.all([
      this.dependencies.locationRepository.listByRoute(route.id),
      this.dependencies.checkinRepository.listByRunId(run.id)
    ]);

    const session: GameSessionSnapshot = this.dependencies.gameSessionService.buildSnapshot(
      {
        run,
        locations,
        checkins
      }
    );

    return {
      run,
      route,
      locations,
      requestedLocation,
      session
    };
  }
}
