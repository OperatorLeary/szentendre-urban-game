import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN
} from "@/core/constants/domain.constants";
import { assertNumberInRange } from "@/core/validation/domain-assertions";

export interface GeoPointProps {
  readonly latitude: number;
  readonly longitude: number;
}

export class GeoPoint {
  public readonly latitude: number;
  public readonly longitude: number;

  public constructor(props: GeoPointProps) {
    assertNumberInRange(props.latitude, "latitude", LATITUDE_MIN, LATITUDE_MAX);
    assertNumberInRange(
      props.longitude,
      "longitude",
      LONGITUDE_MIN,
      LONGITUDE_MAX
    );

    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }

  public equals(other: GeoPoint): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}
