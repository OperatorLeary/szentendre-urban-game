import type { GeoPoint } from "@/core/value-objects/geo-point.vo";

export interface DistanceCalculator {
  calculateMeters(from: GeoPoint, to: GeoPoint): number;
}
