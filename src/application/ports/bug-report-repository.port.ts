import type { BugReport } from "@/core/entities/bug-report.entity";

export interface BugReportRepositoryPort {
  create(report: BugReport): Promise<BugReport>;
}
