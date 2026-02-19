import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { ClockPort } from "@/application/ports/clock.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import { CheckinContextLoaderService } from "@/application/services/checkin-context-loader.service";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import { Checkin } from "@/core/entities/checkin.entity";
import type { Run } from "@/core/entities/run.entity";
import { CheckinMethod } from "@/core/enums/checkin-method.enum";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { CheckinEligibilityReason } from "@/core/models/checkin-eligibility.model";
import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import type { GpsValidationFailureReason } from "@/core/models/gps-validation.model";
import { GameSessionService } from "@/core/services/game-session.service";
import { GpsValidationService } from "@/core/services/gps-validation.service";
import type {
  CheckinId,
  LocationId,
  RunId
} from "@/core/types/identifiers.type";
import type { GeoPoint } from "@/core/value-objects/geo-point.vo";

type EligibilityFailureReason = Exclude<CheckinEligibilityReason, "allowed">;
export type ValidateGpsCheckinFailureReason =
  | EligibilityFailureReason
  | GpsValidationFailureReason;

export interface ValidateGpsCheckinRequest {
  readonly checkinId: CheckinId;
  readonly runId: RunId;
  readonly locationId: LocationId;
  readonly currentPosition: GeoPoint;
  readonly horizontalAccuracyMeters?: number;
  readonly validatedAt?: Date;
}

interface ValidateGpsCheckinAcceptedResponse {
  readonly accepted: true;
  readonly checkin: Checkin;
  readonly session: GameSessionSnapshot;
  readonly distanceMeters: number;
  readonly effectiveThresholdMeters: number;
}

interface ValidateGpsCheckinRejectedResponse {
  readonly accepted: false;
  readonly reason: ValidateGpsCheckinFailureReason;
  readonly distanceMeters?: number;
  readonly effectiveThresholdMeters?: number;
}

export type ValidateGpsCheckinResponse =
  | ValidateGpsCheckinAcceptedResponse
  | ValidateGpsCheckinRejectedResponse;

interface ValidateGpsCheckinDependencies {
  readonly checkinContextLoader: CheckinContextLoaderService;
  readonly checkinRepository: CheckinRepositoryPort;
  readonly runRepository: RunRepositoryPort;
  readonly gameSessionService: GameSessionService;
  readonly gpsValidationService: GpsValidationService;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

export class ValidateGpsCheckinUseCase
  implements UseCase<ValidateGpsCheckinRequest, Promise<ValidateGpsCheckinResponse>>
{
  public constructor(
    private readonly dependencies: ValidateGpsCheckinDependencies
  ) {}

  public async execute(
    request: ValidateGpsCheckinRequest
  ): Promise<ValidateGpsCheckinResponse> {
    const { run, location, locations, checkins } =
      await this.dependencies.checkinContextLoader.load({
        runId: request.runId,
        locationId: request.locationId
      });

    const eligibility = this.dependencies.gameSessionService.evaluateCheckinEligibility(
      {
        run,
        targetLocation: location,
        locations,
        checkins
      }
    );
    if (!eligibility.isAllowed) {
      return {
        accepted: false,
        reason: eligibility.reason
      };
    }

    const gpsValidation = this.dependencies.gpsValidationService.validate({
      currentPosition: request.currentPosition,
      targetPosition: location.position,
      allowedRadiusMeters: location.validationRadiusMeters,
      horizontalAccuracyMeters: request.horizontalAccuracyMeters
    });
    if (!gpsValidation.isValid) {
      return {
        accepted: false,
        reason: gpsValidation.reason,
        distanceMeters: gpsValidation.distanceMeters,
        effectiveThresholdMeters: gpsValidation.effectiveThresholdMeters
      };
    }

    const validatedAt: Date = request.validatedAt ?? this.dependencies.clock.now();
    const checkin = new Checkin({
      id: request.checkinId,
      runId: run.id,
      locationId: location.id,
      method: CheckinMethod.Gps,
      validatedAt,
      distanceMeters: gpsValidation.distanceMeters,
      scannedQrToken: null
    });
    const persistedCheckin: Checkin =
      await this.dependencies.checkinRepository.create(checkin);
    const checkinsAfterWrite: readonly Checkin[] = [...checkins, persistedCheckin];

    let runAfterCheckin: Run = run;
    let session: GameSessionSnapshot = this.dependencies.gameSessionService.buildSnapshot(
      {
        run: runAfterCheckin,
        locations,
        checkins: checkinsAfterWrite
      }
    );

    if (session.isCompleted && runAfterCheckin.status === RunStatus.Active) {
      runAfterCheckin = await this.dependencies.runRepository.update(
        runAfterCheckin.complete(validatedAt)
      );
      session = this.dependencies.gameSessionService.buildSnapshot({
        run: runAfterCheckin,
        locations,
        checkins: checkinsAfterWrite
      });
    }

    this.dependencies.logger.info("GPS check-in accepted.", {
      checkinId: persistedCheckin.id,
      runId: persistedCheckin.runId,
      locationId: persistedCheckin.locationId,
      distanceMeters: gpsValidation.distanceMeters
    });

    return {
      accepted: true,
      checkin: persistedCheckin,
      session,
      distanceMeters: gpsValidation.distanceMeters,
      effectiveThresholdMeters: gpsValidation.effectiveThresholdMeters
    };
  }
}
