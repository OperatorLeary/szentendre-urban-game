const EARTH_RADIUS_METERS = 6_371_000;
const DEGREE_TO_RADIAN = Math.PI / 180;

export function calculateHaversineDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const latDeltaRadians: number = (toLat - fromLat) * DEGREE_TO_RADIAN;
  const lngDeltaRadians: number = (toLng - fromLng) * DEGREE_TO_RADIAN;
  const fromLatRadians: number = fromLat * DEGREE_TO_RADIAN;
  const toLatRadians: number = toLat * DEGREE_TO_RADIAN;

  const haversine: number =
    Math.sin(latDeltaRadians / 2) ** 2 +
    Math.cos(fromLatRadians) *
      Math.cos(toLatRadians) *
      Math.sin(lngDeltaRadians / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
