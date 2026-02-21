export const QR_ROUTE_PROFILES = ["short", "medium", "long"] as const;

export type QrRouteProfile = (typeof QR_ROUTE_PROFILES)[number];

export const QR_ROUTE_PROFILE_TARGET_COUNTS: Readonly<Record<QrRouteProfile, number>> =
  Object.freeze({
    short: 3,
    medium: 12,
    long: 24
  });

export function parseQrRouteProfile(value: string | null | undefined): QrRouteProfile | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue: string = value.trim().toLowerCase();
  return QR_ROUTE_PROFILES.find((profile): boolean => profile === normalizedValue) ?? null;
}

export function resolveQrRouteProfileTargetCount(
  profile: QrRouteProfile | null | undefined
): number | null {
  if (profile === null || profile === undefined) {
    return null;
  }

  return QR_ROUTE_PROFILE_TARGET_COUNTS[profile];
}
