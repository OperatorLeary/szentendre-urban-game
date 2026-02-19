import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { Run } from "@/core/entities/run.entity";
import type { RunId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import {
  toRunEntity,
  toRunInsert,
  toRunUpdate
} from "@/infrastructure/mappers/run.mapper";
import { DeviceContextProvider } from "@/infrastructure/runtime/device-context.provider";
import { DefaultRouteResolver } from "@/infrastructure/runtime/default-route-resolver";
import type { Tables } from "@/infrastructure/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";

type RunRow = Tables["runs"]["Row"];

export class SupabaseRunRepository implements RunRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly defaultRouteResolver: DefaultRouteResolver,
    private readonly deviceContextProvider: DeviceContextProvider,
    private readonly logger: LoggerPort
  ) {}

  public async findById(id: RunId): Promise<Run | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.runs)
      .select(
        "id, route_id, device_id, player_alias, start_location_id, current_sequence_index, status, started_at, completed_at, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch run by ID.",
        {
          repository: "SupabaseRunRepository",
          operation: "findById",
          metadata: {
            runId: id
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return toRunEntity(data as RunRow);
  }

  public async create(run: Run): Promise<Run> {
    const routeId: string = await this.defaultRouteResolver.getDefaultRouteId();
    const deviceId: string = this.deviceContextProvider.getDeviceId();

    const payload = toRunInsert(run, {
      routeId,
      deviceId
    });

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.runs)
      .insert(payload)
      .select(
        "id, route_id, device_id, player_alias, start_location_id, current_sequence_index, status, started_at, completed_at, created_at, updated_at"
      )
      .single();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to create run.",
        {
          repository: "SupabaseRunRepository",
          operation: "create",
          metadata: {
            runId: run.id,
            routeId
          }
        },
        error
      );
    }

    this.logger.debug("Run persisted.", {
      runId: run.id,
      routeId
    });

    return toRunEntity(data as RunRow);
  }

  public async update(run: Run): Promise<Run> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.runs)
      .update(toRunUpdate(run))
      .eq("id", run.id)
      .select(
        "id, route_id, device_id, player_alias, start_location_id, current_sequence_index, status, started_at, completed_at, created_at, updated_at"
      )
      .single();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to update run.",
        {
          repository: "SupabaseRunRepository",
          operation: "update",
          metadata: {
            runId: run.id
          }
        },
        error
      );
    }

    return toRunEntity(data as RunRow);
  }
}
