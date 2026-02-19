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
      const routeSlug: string | undefined = directPathMatch[1];
      const locationSlug: string | undefined = directPathMatch[2];
      if (routeSlug === undefined || locationSlug === undefined) {
        return null;
      }

      return {
        routeSlug: routeSlug.toLowerCase(),
        locationSlug: locationSlug.toLowerCase()
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

      const routeSlug: string | undefined = urlPathMatch[1];
      const locationSlug: string | undefined = urlPathMatch[2];
      if (routeSlug === undefined || locationSlug === undefined) {
        return null;
      }

      return {
        routeSlug: routeSlug.toLowerCase(),
        locationSlug: locationSlug.toLowerCase()
      };
    } catch {
      return null;
    }
  }
}
