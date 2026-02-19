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
    const urlMatch: RegExpExecArray | null = ROUTE_LOCATION_PATTERN.exec(
      url.pathname
    );

    if (urlMatch === null) {
      return null;
    }

    const routeSlug: string | undefined = urlMatch[1];
    const locationSlug: string | undefined = urlMatch[2];
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
