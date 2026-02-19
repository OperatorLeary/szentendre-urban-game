import { BugReport } from "@/core/entities/bug-report.entity";
import {
  toBugReportId,
  toLocationId,
  toRunId
} from "@/core/types/identifiers.type";
import { BugReportDescription } from "@/core/value-objects/bug-report-text.vo";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type BugReportRow = Tables["bug_reports"]["Row"];
type BugReportInsert = Tables["bug_reports"]["Insert"];

export interface BugReportWriteContext {
  readonly deviceInfo: string;
}

export function toBugReportEntity(row: BugReportRow): BugReport {
  try {
    return new BugReport({
      id: toBugReportId(row.id),
      runId: row.run_id === null ? null : toRunId(row.run_id),
      locationId:
        row.location_id === null ? null : toLocationId(row.location_id),
      gpsLatitude: row.gps_lat,
      gpsLongitude: row.gps_lng,
      detectedDistanceMeters: row.detected_distance_m,
      deviceInfo: row.device_info,
      description: BugReportDescription.create(row.description),
      createdAt: parseIsoDate(row.created_at, "BugReportMapper", "bug_reports.created_at")
    });
  } catch (error) {
    throw new RepositoryError(
      "Failed to map bug report row to entity.",
      {
        repository: "BugReportMapper",
        operation: "toBugReportEntity",
        metadata: {
          bugReportId: row.id
        }
      },
      error
    );
  }
}

export function toBugReportInsert(
  entity: BugReport,
  context: BugReportWriteContext
): BugReportInsert {
  return {
    id: entity.id,
    run_id: entity.runId,
    location_id: entity.locationId,
    gps_lat: entity.gpsLatitude,
    gps_lng: entity.gpsLongitude,
    detected_distance_m: entity.detectedDistanceMeters,
    device_info: context.deviceInfo,
    description: entity.description.toString(),
    created_at: entity.createdAt.toISOString()
  };
}
