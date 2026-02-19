export type GpsValidationFailureReason = "outside_radius";

export interface GpsValidationSuccess {
  readonly isValid: true;
  readonly distanceMeters: number;
  readonly effectiveThresholdMeters: number;
}

export interface GpsValidationFailure {
  readonly isValid: false;
  readonly distanceMeters: number;
  readonly effectiveThresholdMeters: number;
  readonly reason: GpsValidationFailureReason;
}

export type GpsValidationResult = GpsValidationSuccess | GpsValidationFailure;
