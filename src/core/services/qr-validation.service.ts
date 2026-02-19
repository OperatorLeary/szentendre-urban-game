import type { QrValidationResult } from "@/core/models/qr-validation.model";
import { QrToken } from "@/core/value-objects/qr-token.vo";

const ROUTE_LOCATION_PATH_PATTERN = /^\/?r\/([^/]+)\/l\/([^/?#]+)/i;

export interface QrValidationInput {
  readonly expectedToken: QrToken;
  readonly expectedRouteSlug: string;
  readonly expectedLocationSlug: string;
  readonly scannedPayload: string;
}

interface ParsedRouteLocation {
  readonly routeSlug: string;
  readonly locationSlug: string;
}

export class QrValidationService {
  public validate(input: QrValidationInput): QrValidationResult {
    const expectedRouteSlug: string = input.expectedRouteSlug.trim().toLowerCase();
    const expectedLocationSlug: string = input.expectedLocationSlug
      .trim()
      .toLowerCase();

    let scannedToken: QrToken | null = null;
    try {
      scannedToken = QrToken.create(input.scannedPayload);
    } catch {
      scannedToken = null;
    }

    if (scannedToken !== null && input.expectedToken.equals(scannedToken)) {
      return {
        isValid: true
      };
    }

    const parsed = this.parseRouteLocation(input.scannedPayload);
    if (parsed === null) {
      return {
        isValid: false,
        reason: scannedToken === null ? "malformed" : "mismatch"
      };
    }

    if (
      parsed.routeSlug === expectedRouteSlug &&
      parsed.locationSlug === expectedLocationSlug
    ) {
      return {
        isValid: true
      };
    }

    return {
      isValid: false,
      reason: "mismatch"
    };
  }

  private parseRouteLocation(payload: string): ParsedRouteLocation | null {
    const normalizedPayload: string = payload.trim();
    if (normalizedPayload.length === 0) {
      return null;
    }

    const directPathMatch: RegExpExecArray | null =
      ROUTE_LOCATION_PATH_PATTERN.exec(normalizedPayload);
    if (directPathMatch !== null) {
      return {
        routeSlug: directPathMatch[1].toLowerCase(),
        locationSlug: directPathMatch[2].toLowerCase()
      };
    }

    try {
      const url = new URL(normalizedPayload);
      const urlPathMatch: RegExpExecArray | null = ROUTE_LOCATION_PATH_PATTERN.exec(
        url.pathname
      );

      if (urlPathMatch === null) {
        return null;
      }

      return {
        routeSlug: urlPathMatch[1].toLowerCase(),
        locationSlug: urlPathMatch[2].toLowerCase()
      };
    } catch {
      return null;
    }
  }
}
