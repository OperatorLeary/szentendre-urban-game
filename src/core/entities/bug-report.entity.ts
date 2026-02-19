import { Entity } from "@/core/entities/entity";
import type { BugReportId, LocationId, RunId } from "@/core/types/identifiers.type";
import { BugReportDescription } from "@/core/value-objects/bug-report-text.vo";
import {
  assertCondition,
  assertFiniteNumber,
  assertValidDate,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

export interface BugReportProps {
  readonly id: BugReportId;
  readonly runId: RunId | null;
  readonly locationId: LocationId | null;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
  readonly detectedDistanceMeters: number | null;
  readonly deviceInfo: string;
  readonly description: BugReportDescription;
  readonly createdAt: Date;
}

export class BugReport extends Entity<BugReportId> {
  public readonly runId: RunId | null;
  public readonly locationId: LocationId | null;
  public readonly gpsLatitude: number | null;
  public readonly gpsLongitude: number | null;
  public readonly detectedDistanceMeters: number | null;
  public readonly deviceInfo: string;
  public readonly description: BugReportDescription;
  public readonly createdAt: Date;

  public constructor(props: BugReportProps) {
    super(props.id);
    assertValidDate(props.createdAt, "bugReportCreatedAt");

    if (props.gpsLatitude !== null) {
      assertFiniteNumber(props.gpsLatitude, "bugReportGpsLatitude");
    }
    if (props.gpsLongitude !== null) {
      assertFiniteNumber(props.gpsLongitude, "bugReportGpsLongitude");
    }
    if (props.detectedDistanceMeters !== null) {
      assertFiniteNumber(props.detectedDistanceMeters, "detectedDistanceMeters");
      assertCondition(
        props.detectedDistanceMeters >= 0,
        "detectedDistanceMeters cannot be negative."
      );
    }

    this.runId = props.runId;
    this.locationId = props.locationId;
    this.gpsLatitude = props.gpsLatitude;
    this.gpsLongitude = props.gpsLongitude;
    this.detectedDistanceMeters = props.detectedDistanceMeters;
    this.deviceInfo = normalizeNonEmptyText(props.deviceInfo, "deviceInfo", 3, 1000);
    this.description = props.description;
    this.createdAt = props.createdAt;
  }
}
