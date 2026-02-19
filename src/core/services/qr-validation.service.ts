import type { QrValidationResult } from "@/core/models/qr-validation.model";
import { QrToken } from "@/core/value-objects/qr-token.vo";

export interface QrValidationInput {
  readonly expectedToken: QrToken;
  readonly scannedPayload: string;
}

export class QrValidationService {
  public validate(input: QrValidationInput): QrValidationResult {
    let scannedToken: QrToken;

    try {
      scannedToken = QrToken.create(input.scannedPayload);
    } catch {
      return {
        isValid: false,
        reason: "malformed"
      };
    }

    if (input.expectedToken.equals(scannedToken)) {
      return {
        isValid: true
      };
    }

    return {
      isValid: false,
      reason: "mismatch"
    };
  }
}
