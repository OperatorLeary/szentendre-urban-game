export const ROUTES = {
  home: "/",
  admin: "/admin",
  routeLocation: "/r/:routeSlug/l/:locationSlug",
  notFound: "*"
} as const;

export function toRouteLocationPath(
  routeSlug: string,
  locationSlug: string
): string {
  return `/r/${routeSlug}/l/${locationSlug}`;
}
