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
import type { QrValidationFailureReason } from "@/core/models/qr-validation.model";
import { GameSessionService } from "@/core/services/game-session.service";
import { QrValidationService } from "@/core/services/qr-validation.service";
import type {
  CheckinId,
  LocationId,
  RunId
} from "@/core/types/identifiers.type";
import { isGlobalBypassAnswer } from "@/core/validation/checkin-bypass-policy";
import { QrToken } from "@/core/value-objects/qr-token.vo";

type EligibilityFailureReason = Exclude<CheckinEligibilityReason, "allowed">;
export type ValidateQrCheckinFailureReason =
  | EligibilityFailureReason
  | QrValidationFailureReason
  | "incorrect_answer";

export interface ValidateQrCheckinRequest {
  readonly checkinId: CheckinId;
  readonly runId: RunId;
  readonly locationId: LocationId;
  readonly expectedRouteSlug: string;
  readonly answerText: string;
  readonly scannedPayload: string;
  readonly validatedAt?: Date;
}

interface ValidateQrCheckinAcceptedResponse {
  readonly accepted: true;
  readonly checkin: Checkin;
  readonly session: GameSessionSnapshot;
}

interface ValidateQrCheckinRejectedResponse {
  readonly accepted: false;
  readonly reason: ValidateQrCheckinFailureReason;
}

export type ValidateQrCheckinResponse =
  | ValidateQrCheckinAcceptedResponse
  | ValidateQrCheckinRejectedResponse;

interface ValidateQrCheckinDependencies {
  readonly checkinContextLoader: CheckinContextLoaderService;
  readonly checkinRepository: CheckinRepositoryPort;
  readonly runRepository: RunRepositoryPort;
  readonly gameSessionService: GameSessionService;
  readonly qrValidationService: QrValidationService;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

export class ValidateQrCheckinUseCase
  implements UseCase<ValidateQrCheckinRequest, Promise<ValidateQrCheckinResponse>>
{
  public constructor(private readonly dependencies: ValidateQrCheckinDependencies) {}

  public async execute(
    request: ValidateQrCheckinRequest
  ): Promise<ValidateQrCheckinResponse> {
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

    const isBypassAnswer: boolean = isGlobalBypassAnswer(request.answerText);
    if (!isBypassAnswer && !location.isAnswerCorrect(request.answerText)) {
      return {
        accepted: false,
        reason: "incorrect_answer"
      };
    }

    const qrValidation = this.dependencies.qrValidationService.validate({
      expectedToken: location.qrToken,
      expectedRouteSlug: request.expectedRouteSlug,
      expectedLocationSlug: location.slug,
      scannedPayload: request.scannedPayload
    });
    if (!qrValidation.isValid) {
      return {
        accepted: false,
        reason: qrValidation.reason
      };
    }

    const scannedQrToken: QrToken = QrToken.create(request.scannedPayload);
    const validatedAt: Date = request.validatedAt ?? this.dependencies.clock.now();
    const checkin = new Checkin({
      id: request.checkinId,
      runId: run.id,
      locationId: location.id,
      sequenceIndex: location.sequenceNumber,
      method: CheckinMethod.Qr,
      validatedAt,
      gpsLatitude: null,
      gpsLongitude: null,
      distanceMeters: null,
      scannedQrToken,
      answerText: request.answerText,
      isAnswerCorrect: true
    });
    const persistedCheckin: Checkin =
      await this.dependencies.checkinRepository.create(checkin);
    const checkinsAfterWrite: readonly Checkin[] = [...checkins, persistedCheckin];

    let runAfterCheckin: Run = run.withCurrentSequenceIndex(
      run.currentSequenceIndex + 1
    );
    let session: GameSessionSnapshot = this.dependencies.gameSessionService.buildSnapshot(
      {
        run: runAfterCheckin,
        locations,
        checkins: checkinsAfterWrite
      }
    );

    if (session.isCompleted && runAfterCheckin.status === RunStatus.Active) {
      runAfterCheckin = runAfterCheckin.complete(validatedAt);
    }

    runAfterCheckin = await this.dependencies.runRepository.update(runAfterCheckin);
    session = this.dependencies.gameSessionService.buildSnapshot({
      run: runAfterCheckin,
      locations,
      checkins: checkinsAfterWrite
    });

    this.dependencies.logger.info("QR check-in accepted.", {
      checkinId: persistedCheckin.id,
      runId: persistedCheckin.runId,
      locationId: persistedCheckin.locationId
    });

    return {
      accepted: true,
      checkin: persistedCheckin,
      session
    };
  }
}
