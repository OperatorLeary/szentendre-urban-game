import { GPS_DISTANCE_TOLERANCE_METERS } from "@/core/constants/domain.constants";
import type { GpsValidationResult } from "@/core/models/gps-validation.model";
import type { DistanceCalculator } from "@/core/services/distance-calculator.interface";
import type { GeoPoint } from "@/core/value-objects/geo-point.vo";
import {
  assertCondition,
  assertFiniteNumber
} from "@/core/validation/domain-assertions";

export interface GpsValidationInput {
  readonly currentPosition: GeoPoint;
  readonly targetPosition: GeoPoint;
  readonly allowedRadiusMeters: number;
  readonly horizontalAccuracyMeters?: number;
}

export class GpsValidationService {
  public constructor(
    private readonly distanceCalculator: DistanceCalculator,
    private readonly baseToleranceMeters: number = GPS_DISTANCE_TOLERANCE_METERS
  ) {
    assertFiniteNumber(this.baseToleranceMeters, "baseToleranceMeters");
    assertCondition(
      this.baseToleranceMeters >= 0,
      "baseToleranceMeters must be non-negative."
    );
  }

  public validate(input: GpsValidationInput): GpsValidationResult {
    assertFiniteNumber(input.allowedRadiusMeters, "allowedRadiusMeters");
    assertCondition(
      input.allowedRadiusMeters >= 0,
      "allowedRadiusMeters must be non-negative."
    );

    const horizontalAccuracyMeters: number = input.horizontalAccuracyMeters ?? 0;
    assertFiniteNumber(horizontalAccuracyMeters, "horizontalAccuracyMeters");
    assertCondition(
      horizontalAccuracyMeters >= 0,
      "horizontalAccuracyMeters must be non-negative."
    );

    const distanceMeters: number = this.distanceCalculator.calculateMeters(
      input.currentPosition,
      input.targetPosition
    );
    const effectiveThresholdMeters: number =
      input.allowedRadiusMeters +
      horizontalAccuracyMeters +
      this.baseToleranceMeters;

    if (distanceMeters <= effectiveThresholdMeters) {
      return {
        isValid: true,
        distanceMeters,
        effectiveThresholdMeters
      };
    }

    return {
      isValid: false,
      distanceMeters,
      effectiveThresholdMeters,
      reason: "outside_radius"
    };
  }
}
