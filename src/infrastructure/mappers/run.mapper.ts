import { Run } from "@/core/entities/run.entity";
import { RunStatus } from "@/core/enums/run-status.enum";
import { toRunId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type RunRow = Tables["runs"]["Row"];
type RunInsert = Tables["runs"]["Insert"];
type RunUpdate = Tables["runs"]["Update"];

export function toRunEntity(row: RunRow): Run {
  try {
    return new Run({
      id: toRunId(row.id),
      playerAlias: row.player_alias,
      status: toRunStatus(row.status),
      startedAt: parseIsoDate(row.started_at, "RunMapper", "runs.started_at"),
      completedAt:
        row.completed_at === null
          ? null
          : parseIsoDate(row.completed_at, "RunMapper", "runs.completed_at")
    });
  } catch (error) {
    throw new RepositoryError(
      "Failed to map run row to entity.",
      {
        repository: "RunMapper",
        operation: "toRunEntity",
        metadata: {
          runId: row.id
        }
      },
      error
    );
  }
}

export interface RunWriteContext {
  readonly routeId: string;
  readonly deviceId: string;
  readonly currentSequenceIndex?: number;
}

export function toRunInsert(row: Run, context: RunWriteContext): RunInsert {
  return {
    id: row.id,
    route_id: context.routeId,
    device_id: context.deviceId,
    player_alias: row.playerAlias,
    current_sequence_index: context.currentSequenceIndex ?? 1,
    status: fromRunStatus(row.status),
    started_at: row.startedAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null
  };
}

export function toRunUpdate(row: Run): RunUpdate {
  return {
    player_alias: row.playerAlias,
    status: fromRunStatus(row.status),
    completed_at: row.completedAt?.toISOString() ?? null
  };
}

function toRunStatus(value: RunRow["status"]): RunStatus {
  switch (value) {
    case "active":
      return RunStatus.Active;
    case "completed":
      return RunStatus.Completed;
    case "abandoned":
      return RunStatus.Abandoned;
    default:
      throw new RepositoryError("Unknown run status value.", {
        repository: "RunMapper",
        operation: "toRunStatus",
        metadata: {
          value
        }
      });
  }
}

function fromRunStatus(status: RunStatus): RunRow["status"] {
  switch (status) {
    case RunStatus.Active:
      return "active";
    case RunStatus.Completed:
      return "completed";
    case RunStatus.Abandoned:
      return "abandoned";
    default:
      throw new RepositoryError("Unsupported RunStatus value.", {
        repository: "RunMapper",
        operation: "fromRunStatus",
        metadata: {
          status
        }
      });
  }
}
