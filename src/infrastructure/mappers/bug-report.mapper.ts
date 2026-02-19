import { BugReport } from "@/core/entities/bug-report.entity";
import { toBugReportId, toRunId } from "@/core/types/identifiers.type";
import {
  BugReportDetails,
  BugReportSummary
} from "@/core/value-objects/bug-report-text.vo";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type BugReportRow = Tables["bug_reports"]["Row"];
type BugReportInsert = Tables["bug_reports"]["Insert"];

const SUMMARY_PREFIX = "Summary:";
const DETAILS_PREFIX = "Details:";

export interface BugReportWriteContext {
  readonly deviceInfo: string;
}

export function toBugReportEntity(row: BugReportRow): BugReport {
  const { summary, details } = parseDescription(row.description);

  try {
    return new BugReport({
      id: toBugReportId(row.id),
      runId: row.run_id === null ? null : toRunId(row.run_id),
      summary: BugReportSummary.create(summary),
      details: BugReportDetails.create(details),
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
    device_info: context.deviceInfo,
    description: formatDescription(
      entity.summary.toString(),
      entity.details.toString()
    ),
    created_at: entity.createdAt.toISOString()
  };
}

function formatDescription(summary: string, details: string): string {
  return `${SUMMARY_PREFIX} ${summary}\n\n${DETAILS_PREFIX} ${details}`;
}

function parseDescription(
  rawDescription: string
): { readonly summary: string; readonly details: string } {
  const normalized: string = rawDescription.trim();

  if (!normalized.startsWith(SUMMARY_PREFIX)) {
    return {
      summary: normalized.slice(0, 140),
      details: normalized
    };
  }

  const segments: readonly string[] = normalized.split("\n\n");
  const summarySegment: string = segments[0] ?? normalized;
  const detailsSegment: string = segments[1] ?? `${DETAILS_PREFIX} ${normalized}`;

  return {
    summary: summarySegment.replace(SUMMARY_PREFIX, "").trim(),
    details: detailsSegment.replace(DETAILS_PREFIX, "").trim()
  };
}
