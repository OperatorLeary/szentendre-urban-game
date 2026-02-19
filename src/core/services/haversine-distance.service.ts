import {
  DEGREES_IN_HALF_TURN,
  EARTH_RADIUS_METERS
} from "@/core/constants/domain.constants";
import type { DistanceCalculator } from "@/core/services/distance-calculator.interface";
import type { GeoPoint } from "@/core/value-objects/geo-point.vo";

export class HaversineDistanceService implements DistanceCalculator {
  public calculateMeters(from: GeoPoint, to: GeoPoint): number {
    const latitudeDeltaRadians: number = this.toRadians(
      to.latitude - from.latitude
    );
    const longitudeDeltaRadians: number = this.toRadians(
      to.longitude - from.longitude
    );
    const fromLatitudeRadians: number = this.toRadians(from.latitude);
    const toLatitudeRadians: number = this.toRadians(to.latitude);

    const haversineComponent: number =
      Math.sin(latitudeDeltaRadians / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDeltaRadians / 2) ** 2;

    const centralAngle: number =
      2 *
      Math.atan2(
        Math.sqrt(haversineComponent),
        Math.sqrt(1 - haversineComponent)
      );

    return EARTH_RADIUS_METERS * centralAngle;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / DEGREES_IN_HALF_TURN;
  }
}
