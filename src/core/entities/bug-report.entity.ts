import { Entity } from "@/core/entities/entity";
import type { BugReportId, RunId } from "@/core/types/identifiers.type";
import {
  BugReportDetails,
  BugReportSummary
} from "@/core/value-objects/bug-report-text.vo";
import { assertValidDate } from "@/core/validation/domain-assertions";

export interface BugReportProps {
  readonly id: BugReportId;
  readonly runId: RunId | null;
  readonly summary: BugReportSummary;
  readonly details: BugReportDetails;
  readonly createdAt: Date;
}

export class BugReport extends Entity<BugReportId> {
  public readonly runId: RunId | null;
  public readonly summary: BugReportSummary;
  public readonly details: BugReportDetails;
  public readonly createdAt: Date;

  public constructor(props: BugReportProps) {
    super(props.id);
    assertValidDate(props.createdAt, "bugReportCreatedAt");

    this.runId = props.runId;
    this.summary = props.summary;
    this.details = props.details;
    this.createdAt = props.createdAt;
  }
}
