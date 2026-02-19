import {
  MAX_LOCATION_ANSWER_LENGTH,
  MIN_LOCATION_ANSWER_LENGTH
} from "@/core/constants/domain.constants";
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
  assertPositiveInteger,
  assertValidDate,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

export interface CheckinProps {
  readonly id: CheckinId;
  readonly runId: RunId;
  readonly locationId: LocationId;
  readonly sequenceIndex: number;
  readonly method: CheckinMethod;
  readonly validatedAt: Date;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
  readonly distanceMeters: number | null;
  readonly scannedQrToken: QrToken | null;
  readonly answerText: string;
  readonly isAnswerCorrect: boolean;
}

export class Checkin extends Entity<CheckinId> {
  public readonly runId: RunId;
  public readonly locationId: LocationId;
  public readonly sequenceIndex: number;
  public readonly method: CheckinMethod;
  public readonly validatedAt: Date;
  public readonly gpsLatitude: number | null;
  public readonly gpsLongitude: number | null;
  public readonly distanceMeters: number | null;
  public readonly scannedQrToken: QrToken | null;
  public readonly answerText: string;
  public readonly isAnswerCorrect: boolean;

  public constructor(props: CheckinProps) {
    super(props.id);
    assertPositiveInteger(props.sequenceIndex, "sequenceIndex");
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

    if (props.gpsLatitude !== null) {
      assertFiniteNumber(props.gpsLatitude, "gpsLatitude");
    }
    if (props.gpsLongitude !== null) {
      assertFiniteNumber(props.gpsLongitude, "gpsLongitude");
    }

    const normalizedAnswer: string = normalizeNonEmptyText(
      props.answerText,
      "answerText",
      MIN_LOCATION_ANSWER_LENGTH,
      MAX_LOCATION_ANSWER_LENGTH
    );

    this.runId = props.runId;
    this.locationId = props.locationId;
    this.sequenceIndex = props.sequenceIndex;
    this.method = props.method;
    this.validatedAt = props.validatedAt;
    this.gpsLatitude = props.gpsLatitude;
    this.gpsLongitude = props.gpsLongitude;
    this.distanceMeters = props.distanceMeters;
    this.scannedQrToken = props.scannedQrToken;
    this.answerText = normalizedAnswer;
    this.isAnswerCorrect = props.isAnswerCorrect;
  }
}
