import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { Checkin } from "@/core/entities/checkin.entity";
import type { LocationId, RunId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import {
  toCheckinEntity,
  toCheckinInsert
} from "@/infrastructure/mappers/checkin.mapper";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";

type CheckinRow = Tables["checkins"]["Row"];

interface RunRouteContext {
  readonly routeId: string;
}

export class SupabaseCheckinRepository implements CheckinRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: LoggerPort
  ) {}

  public async create(checkin: Checkin): Promise<Checkin> {
    const runRouteContext: RunRouteContext = await this.getRunRouteContext(
      checkin.runId
    );

    const payload = toCheckinInsert(checkin, {
      routeId: runRouteContext.routeId
    });

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.checkins)
      .insert(payload)
      .select(
        "id, run_id, route_id, location_id, sequence_index, validation_type, validated_at, gps_lat, gps_lng, detected_distance_m, scanned_qr_token, answer_text, is_answer_correct, created_at, updated_at"
      )
      .single();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to create check-in.",
        {
          repository: "SupabaseCheckinRepository",
          operation: "create",
          metadata: {
            checkinId: checkin.id,
            runId: checkin.runId,
            locationId: checkin.locationId
          }
        },
        error
      );
    }

    this.logger.debug("Check-in persisted.", {
      checkinId: checkin.id,
      runId: checkin.runId
    });

    return toCheckinEntity(data as CheckinRow);
  }

  public async listByRunId(runId: RunId): Promise<readonly Checkin[]> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.checkins)
      .select(
        "id, run_id, route_id, location_id, sequence_index, validation_type, validated_at, gps_lat, gps_lng, detected_distance_m, scanned_qr_token, answer_text, is_answer_correct, created_at, updated_at"
      )
      .eq("run_id", runId)
      .order("sequence_index", { ascending: true });

    if (error !== null) {
      throw new RepositoryError(
        "Failed to list check-ins by run ID.",
        {
          repository: "SupabaseCheckinRepository",
          operation: "listByRunId",
          metadata: {
            runId
          }
        },
        error
      );
    }

    return (data ?? []).map((row): Checkin => toCheckinEntity(row as CheckinRow));
  }

  public async findByRunAndLocation(
    runId: RunId,
    locationId: LocationId
  ): Promise<Checkin | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.checkins)
      .select(
        "id, run_id, route_id, location_id, sequence_index, validation_type, validated_at, gps_lat, gps_lng, detected_distance_m, scanned_qr_token, answer_text, is_answer_correct, created_at, updated_at"
      )
      .eq("run_id", runId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch check-in by run and location.",
        {
          repository: "SupabaseCheckinRepository",
          operation: "findByRunAndLocation",
          metadata: {
            runId,
            locationId
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return toCheckinEntity(data as CheckinRow);
  }

  private async getRunRouteContext(runId: RunId): Promise<RunRouteContext> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.runs)
      .select("route_id")
      .eq("id", runId)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to resolve run route context.",
        {
          repository: "SupabaseCheckinRepository",
          operation: "getRunRouteContext",
          metadata: {
            runId
          }
        },
        error
      );
    }

    if (data === null) {
      throw new RepositoryError("Run not found for check-in persistence.", {
        repository: "SupabaseCheckinRepository",
        operation: "getRunRouteContext",
        metadata: {
          runId
        }
      });
    }

    return {
      routeId: data.route_id
    };
  }
}
