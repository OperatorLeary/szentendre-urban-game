const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_LOCATION_PATTERN = /^\/?r\/([^/]+)\/l\/([^/?#]+)/i;

export interface RouteLocationPayload {
  readonly routeSlug: string;
  readonly locationSlug: string;
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value.trim().toLowerCase());
}

export function parseRouteLocationPayload(
  payload: string
): RouteLocationPayload | null {
  const normalizedPayload: string = payload.trim();
  if (normalizedPayload.length === 0) {
    return null;
  }

  const directPathMatch: RegExpExecArray | null =
    ROUTE_LOCATION_PATTERN.exec(normalizedPayload);
  if (directPathMatch !== null) {
    return {
      routeSlug: directPathMatch[1].toLowerCase(),
      locationSlug: directPathMatch[2].toLowerCase()
    };
  }

  try {
    const url = new URL(normalizedPayload);
    const urlMatch: RegExpExecArray | null = ROUTE_LOCATION_PATTERN.exec(
      url.pathname
    );

    if (urlMatch === null) {
      return null;
    }

    return {
      routeSlug: urlMatch[1].toLowerCase(),
      locationSlug: urlMatch[2].toLowerCase()
    };
  } catch {
    return null;
  }
}
