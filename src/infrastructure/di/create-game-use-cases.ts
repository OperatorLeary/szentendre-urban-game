import type { GameUseCases } from "@/application/contracts/game-use-cases.contract";
import type { BugReportRepositoryPort } from "@/application/ports/bug-report-repository.port";
import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { ClockPort } from "@/application/ports/clock.port";
import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import { CheckinContextLoaderService } from "@/application/services/checkin-context-loader.service";
import {
  EnsureRunSessionUseCase,
  GetRunProgressUseCase,
  ListRoutesUseCase,
  SubmitBugReportUseCase,
  ValidateGpsCheckinUseCase,
  ValidateQrCheckinUseCase
} from "@/application";
import { GameSessionService } from "@/core/services/game-session.service";
import { GpsValidationService } from "@/core/services/gps-validation.service";
import { HaversineDistanceService } from "@/core/services/haversine-distance.service";
import { ProgressTrackingService } from "@/core/services/progress-tracking.service";
import { QrValidationService } from "@/core/services/qr-validation.service";

interface CreateGameUseCasesInput {
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
  readonly repositories: {
    readonly runRepository: RunRepositoryPort;
    readonly routeRepository: RouteRepositoryPort;
    readonly locationRepository: LocationRepositoryPort;
    readonly checkinRepository: CheckinRepositoryPort;
    readonly bugReportRepository: BugReportRepositoryPort;
  };
}

export function createGameUseCases(
  input: CreateGameUseCasesInput
): GameUseCases {
  const progressTrackingService = new ProgressTrackingService();
  const gameSessionService = new GameSessionService(progressTrackingService);
  const gpsValidationService = new GpsValidationService(
    new HaversineDistanceService()
  );
  const qrValidationService = new QrValidationService();

  const checkinContextLoader = new CheckinContextLoaderService({
    runRepository: input.repositories.runRepository,
    locationRepository: input.repositories.locationRepository,
    checkinRepository: input.repositories.checkinRepository
  });

  const listRoutesUseCase = new ListRoutesUseCase({
    routeRepository: input.repositories.routeRepository,
    locationRepository: input.repositories.locationRepository
  });
  const ensureRunSessionUseCase = new EnsureRunSessionUseCase({
    runRepository: input.repositories.runRepository,
    routeRepository: input.repositories.routeRepository,
    locationRepository: input.repositories.locationRepository,
    checkinRepository: input.repositories.checkinRepository,
    gameSessionService,
    logger: input.logger,
    clock: input.clock
  });
  const getRunProgressUseCase = new GetRunProgressUseCase({
    runRepository: input.repositories.runRepository,
    locationRepository: input.repositories.locationRepository,
    checkinRepository: input.repositories.checkinRepository,
    gameSessionService,
    logger: input.logger
  });
  const validateGpsCheckinUseCase = new ValidateGpsCheckinUseCase({
    checkinContextLoader,
    checkinRepository: input.repositories.checkinRepository,
    runRepository: input.repositories.runRepository,
    gameSessionService,
    gpsValidationService,
    logger: input.logger,
    clock: input.clock
  });
  const validateQrCheckinUseCase = new ValidateQrCheckinUseCase({
    checkinContextLoader,
    checkinRepository: input.repositories.checkinRepository,
    runRepository: input.repositories.runRepository,
    gameSessionService,
    qrValidationService,
    logger: input.logger,
    clock: input.clock
  });
  const submitBugReportUseCase = new SubmitBugReportUseCase({
    bugReportRepository: input.repositories.bugReportRepository,
    runRepository: input.repositories.runRepository,
    logger: input.logger,
    clock: input.clock
  });

  return {
    async listRoutes() {
      return listRoutesUseCase.execute({});
    },
    async ensureRunSession(request) {
      return ensureRunSessionUseCase.execute(request);
    },
    async getRunProgress(request) {
      return getRunProgressUseCase.execute(request);
    },
    async validateGpsCheckin(request) {
      return validateGpsCheckinUseCase.execute(request);
    },
    async validateQrCheckin(request) {
      return validateQrCheckinUseCase.execute(request);
    },
    async submitBugReport(request) {
      return submitBugReportUseCase.execute(request);
    }
  };
}
