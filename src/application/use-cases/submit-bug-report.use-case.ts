import type { BugReportRepositoryPort } from "@/application/ports/bug-report-repository.port";
import type { ClockPort } from "@/application/ports/clock.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import { BugReport } from "@/core/entities/bug-report.entity";
import type { Run } from "@/core/entities/run.entity";
import { ApplicationError } from "@/core/errors/app-error";
import type {
  BugReportId,
  LocationId,
  RunId
} from "@/core/types/identifiers.type";
import { BugReportDescription } from "@/core/value-objects/bug-report-text.vo";

export interface SubmitBugReportRequest {
  readonly bugReportId: BugReportId;
  readonly runId: RunId | null;
  readonly locationId: LocationId | null;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
  readonly detectedDistanceMeters: number | null;
  readonly description: string;
  readonly createdAt?: Date;
}

export type SubmitBugReportResponse = BugReport;

interface SubmitBugReportDependencies {
  readonly bugReportRepository: BugReportRepositoryPort;
  readonly runRepository: RunRepositoryPort;
  readonly logger: LoggerPort;
  readonly clock: ClockPort;
}

export class SubmitBugReportUseCase
  implements UseCase<SubmitBugReportRequest, Promise<SubmitBugReportResponse>>
{
  public constructor(private readonly dependencies: SubmitBugReportDependencies) {}

  public async execute(
    request: SubmitBugReportRequest
  ): Promise<SubmitBugReportResponse> {
    if (request.runId !== null) {
      const existingRun: Run | null = await this.dependencies.runRepository.findById(
        request.runId
      );
      if (existingRun === null) {
        throw new ApplicationError("Cannot submit bug report for unknown run.", {
          context: {
            runId: request.runId
          }
        });
      }
    }

    const description: BugReportDescription = BugReportDescription.create(
      request.description
    );
    const createdAt: Date = request.createdAt ?? this.dependencies.clock.now();

    const bugReport = new BugReport({
      id: request.bugReportId,
      runId: request.runId,
      locationId: request.locationId,
      gpsLatitude: request.gpsLatitude,
      gpsLongitude: request.gpsLongitude,
      detectedDistanceMeters: request.detectedDistanceMeters,
      deviceInfo: "client-device",
      description,
      createdAt
    });

    const persistedBugReport: BugReport =
      await this.dependencies.bugReportRepository.create(bugReport);

    this.dependencies.logger.info("Bug report submitted.", {
      bugReportId: persistedBugReport.id,
      runId: persistedBugReport.runId
    });

    return persistedBugReport;
  }
}
