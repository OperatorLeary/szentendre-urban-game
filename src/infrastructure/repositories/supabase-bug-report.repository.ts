import type { BugReportRepositoryPort } from "@/application/ports/bug-report-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { BugReport } from "@/core/entities/bug-report.entity";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import {
  toBugReportEntity,
  toBugReportInsert
} from "@/infrastructure/mappers/bug-report.mapper";
import { DeviceContextProvider } from "@/infrastructure/runtime/device-context.provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";

type BugReportRow = Tables["bug_reports"]["Row"];

export class SupabaseBugReportRepository implements BugReportRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly deviceContextProvider: DeviceContextProvider,
    private readonly logger: LoggerPort
  ) {}

  public async create(report: BugReport): Promise<BugReport> {
    const payload = toBugReportInsert(report, {
      deviceInfo: this.deviceContextProvider.getDeviceInfo()
    });

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.bugReports)
      .insert(payload)
      .select(
        "id, run_id, location_id, gps_lat, gps_lng, detected_distance_m, device_info, description, created_at, updated_at"
      )
      .single();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to create bug report.",
        {
          repository: "SupabaseBugReportRepository",
          operation: "create",
          metadata: {
            bugReportId: report.id,
            runId: report.runId
          }
        },
        error
      );
    }

    this.logger.debug("Bug report persisted.", {
      bugReportId: report.id
    });

    return toBugReportEntity(data as BugReportRow);
  }
}
