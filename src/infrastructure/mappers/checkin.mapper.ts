import { Checkin } from "@/core/entities/checkin.entity";
import { CheckinMethod } from "@/core/enums/checkin-method.enum";
import {
  toCheckinId,
  toLocationId,
  toRunId
} from "@/core/types/identifiers.type";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type CheckinRow = Tables["checkins"]["Row"];
type CheckinInsert = Tables["checkins"]["Insert"];

export interface CheckinWriteContext {
  readonly routeId: string;
  readonly sequenceIndex: number;
}

export function toCheckinEntity(row: CheckinRow): Checkin {
  try {
    return new Checkin({
      id: toCheckinId(row.id),
      runId: toRunId(row.run_id),
      locationId: toLocationId(row.location_id),
      method: toCheckinMethod(row.validation_type),
      validatedAt: parseIsoDate(row.validated_at, "CheckinMapper", "checkins.validated_at"),
      distanceMeters: row.detected_distance_m,
      scannedQrToken:
        row.scanned_qr_token === null ? null : QrToken.create(row.scanned_qr_token)
    });
  } catch (error) {
    throw new RepositoryError(
      "Failed to map checkin row to entity.",
      {
        repository: "CheckinMapper",
        operation: "toCheckinEntity",
        metadata: {
          checkinId: row.id
        }
      },
      error
    );
  }
}

export function toCheckinInsert(
  entity: Checkin,
  context: CheckinWriteContext
): CheckinInsert {
  return {
    id: entity.id,
    run_id: entity.runId,
    route_id: context.routeId,
    location_id: entity.locationId,
    sequence_index: context.sequenceIndex,
    validation_type: fromCheckinMethod(entity.method),
    validated_at: entity.validatedAt.toISOString(),
    gps_lat: null,
    gps_lng: null,
    detected_distance_m: entity.distanceMeters,
    scanned_qr_token: entity.scannedQrToken?.toString() ?? null
  };
}

function toCheckinMethod(value: CheckinRow["validation_type"]): CheckinMethod {
  switch (value) {
    case "gps":
      return CheckinMethod.Gps;
    case "qr_override":
      return CheckinMethod.Qr;
    default:
      throw new RepositoryError("Unknown validation_type value.", {
        repository: "CheckinMapper",
        operation: "toCheckinMethod",
        metadata: {
          value
        }
      });
  }
}

function fromCheckinMethod(
  method: CheckinMethod
): CheckinRow["validation_type"] {
  switch (method) {
    case CheckinMethod.Gps:
      return "gps";
    case CheckinMethod.Qr:
      return "qr_override";
    default:
      throw new RepositoryError("Unsupported CheckinMethod value.", {
        repository: "CheckinMapper",
        operation: "fromCheckinMethod",
        metadata: {
          method
        }
      });
  }
}
