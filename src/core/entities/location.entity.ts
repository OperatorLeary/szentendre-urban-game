import {
  MAX_LOCATION_CODE_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  MIN_LOCATION_CODE_LENGTH,
  MIN_LOCATION_NAME_LENGTH,
  MIN_LOCATION_RADIUS_METERS,
  MAX_LOCATION_RADIUS_METERS
} from "@/core/constants/domain.constants";
import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import type { LocationId } from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import {
  assertCondition,
  assertPositiveInteger,
  assertValidDate,
  assertNumberInRange,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

const LOCATION_CODE_PATTERN = /^[a-z0-9_-]+$/i;

export interface LocationProps {
  readonly id: LocationId;
  readonly code: string;
  readonly name: string;
  readonly position: GeoPoint;
  readonly validationRadiusMeters: number;
  readonly sequenceNumber: number;
  readonly qrToken: QrToken;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Location extends Entity<LocationId> {
  public readonly code: string;
  public readonly name: string;
  public readonly position: GeoPoint;
  public readonly validationRadiusMeters: number;
  public readonly sequenceNumber: number;
  public readonly qrToken: QrToken;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  public constructor(props: LocationProps) {
    super(props.id);

    const normalizedCode: string = normalizeNonEmptyText(
      props.code,
      "locationCode",
      MIN_LOCATION_CODE_LENGTH,
      MAX_LOCATION_CODE_LENGTH
    );
    const normalizedName: string = normalizeNonEmptyText(
      props.name,
      "locationName",
      MIN_LOCATION_NAME_LENGTH,
      MAX_LOCATION_NAME_LENGTH
    );

    if (!LOCATION_CODE_PATTERN.test(normalizedCode)) {
      throw new DomainError(
        "locationCode can only contain letters, numbers, underscore, and dash."
      );
    }

    assertNumberInRange(
      props.validationRadiusMeters,
      "validationRadiusMeters",
      MIN_LOCATION_RADIUS_METERS,
      MAX_LOCATION_RADIUS_METERS
    );
    assertPositiveInteger(props.sequenceNumber, "sequenceNumber");
    assertValidDate(props.createdAt, "locationCreatedAt");
    assertValidDate(props.updatedAt, "locationUpdatedAt");
    assertCondition(
      props.updatedAt.getTime() >= props.createdAt.getTime(),
      "locationUpdatedAt cannot be before locationCreatedAt."
    );

    this.code = normalizedCode.toLowerCase();
    this.name = normalizedName;
    this.position = props.position;
    this.validationRadiusMeters = props.validationRadiusMeters;
    this.sequenceNumber = props.sequenceNumber;
    this.qrToken = props.qrToken;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static compareBySequence(a: Location, b: Location): number {
    return a.sequenceNumber - b.sequenceNumber;
  }
}
