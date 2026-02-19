import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import { CheckinMethod } from "@/core/enums/checkin-method.enum";
import type {
  CheckinId,
  LocationId,
  RunId
} from "@/core/types/identifiers.type";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import {
  assertCondition,
  assertFiniteNumber,
  assertValidDate
} from "@/core/validation/domain-assertions";

export interface CheckinProps {
  readonly id: CheckinId;
  readonly runId: RunId;
  readonly locationId: LocationId;
  readonly method: CheckinMethod;
  readonly validatedAt: Date;
  readonly distanceMeters: number | null;
  readonly scannedQrToken: QrToken | null;
}

export class Checkin extends Entity<CheckinId> {
  public readonly runId: RunId;
  public readonly locationId: LocationId;
  public readonly method: CheckinMethod;
  public readonly validatedAt: Date;
  public readonly distanceMeters: number | null;
  public readonly scannedQrToken: QrToken | null;

  public constructor(props: CheckinProps) {
    super(props.id);
    assertValidDate(props.validatedAt, "checkinValidatedAt");

    if (props.method === CheckinMethod.Gps) {
      if (props.distanceMeters === null) {
        throw new DomainError("distanceMeters is required for GPS check-in.");
      }

      assertFiniteNumber(props.distanceMeters, "distanceMeters");
      assertCondition(props.distanceMeters >= 0, "distanceMeters cannot be negative.");
      assertCondition(
        props.scannedQrToken === null,
        "scannedQrToken must be null for GPS check-in."
      );
    }

    if (props.method === CheckinMethod.Qr) {
      assertCondition(
        props.scannedQrToken !== null,
        "scannedQrToken is required for QR check-in."
      );
      assertCondition(
        props.distanceMeters === null,
        "distanceMeters must be null for QR check-in."
      );
    }

    this.runId = props.runId;
    this.locationId = props.locationId;
    this.method = props.method;
    this.validatedAt = props.validatedAt;
    this.distanceMeters = props.distanceMeters;
    this.scannedQrToken = props.scannedQrToken;
  }
}
