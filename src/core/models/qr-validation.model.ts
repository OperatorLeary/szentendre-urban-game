export type QrValidationFailureReason = "mismatch" | "malformed";

export interface QrValidationSuccess {
  readonly isValid: true;
}

export interface QrValidationFailure {
  readonly isValid: false;
  readonly reason: QrValidationFailureReason;
}

export type QrValidationResult = QrValidationSuccess | QrValidationFailure;
