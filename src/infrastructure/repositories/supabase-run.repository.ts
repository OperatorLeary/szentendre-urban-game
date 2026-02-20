import type { LoggerPort } from "@/application/ports/logger.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import type { Run } from "@/core/entities/run.entity";
import {
  APP_ERROR_CODES,
  type AppErrorCode
} from "@/core/errors/error-codes";
import type { RunId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import {
  toRunEntity,
  toRunInsert,
  toRunUpdate
} from "@/infrastructure/mappers/run.mapper";
import { DeviceContextProvider } from "@/infrastructure/runtime/device-context.provider";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import type { SupabaseClient } from "@supabase/supabase-js";

type RunRow = Tables["runs"]["Row"];

function extractErrorSignal(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return `${error.message} ${extractErrorSignal((error as { cause?: unknown }).cause)}`;
  }

  if (typeof error === "object" && error !== null) {
    const errorLike = error as {
      readonly message?: unknown;
      readonly details?: unknown;
      readonly hint?: unknown;
      readonly code?: unknown;
      readonly cause?: unknown;
    };

    return [
      extractErrorSignal(errorLike.message),
      extractErrorSignal(errorLike.details),
      extractErrorSignal(errorLike.hint),
      extractErrorSignal(errorLike.code),
      extractErrorSignal(errorLike.cause)
    ].join(" ");
  }

  return "";
}

function resolveRunCreateErrorCode(error: unknown): AppErrorCode {
  const errorSignal: string = extractErrorSignal(error).toLowerCase();

  if (
    errorSignal.includes("player_alias_contains_blocked_content") ||
    errorSignal.includes("contains_blocked_content")
  ) {
    return APP_ERROR_CODES.playerAliasBlockedContent;
  }

  if (
    errorSignal.includes("player_alias_contact_or_url_not_allowed") ||
    errorSignal.includes("contains_url_or_contact")
  ) {
    return APP_ERROR_CODES.playerAliasLinkOrContact;
  }

  if (errorSignal.includes("runs_player_alias_length_chk")) {
    return APP_ERROR_CODES.playerAliasInvalidLength;
  }

  if (errorSignal.includes("uq_runs_active_per_device")) {
    return APP_ERROR_CODES.activeRunAlreadyExistsForDevice;
  }

  return APP_ERROR_CODES.runCreateFailed;
}

export class SupabaseRunRepository implements RunRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
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

  public async findActiveForCurrentDevice(): Promise<Run | null> {
    const deviceId: string = this.deviceContextProvider.getDeviceId();

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.runs)
      .select(
        "id, route_id, device_id, player_alias, start_location_id, current_sequence_index, status, started_at, completed_at, created_at, updated_at"
      )
      .eq("device_id", deviceId)
      .eq("status", "active")
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch active run for device.",
        {
          repository: "SupabaseRunRepository",
          operation: "findActiveForCurrentDevice",
          metadata: {
            deviceId
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
    const deviceId: string = this.deviceContextProvider.getDeviceId();
    const payload = toRunInsert(run, {
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
          errorCode: resolveRunCreateErrorCode(error),
          metadata: {
            runId: run.id,
            routeId: run.routeId
          }
        },
        error
      );
    }

    this.logger.debug("Run persisted.", {
      runId: run.id,
      routeId: run.routeId
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
