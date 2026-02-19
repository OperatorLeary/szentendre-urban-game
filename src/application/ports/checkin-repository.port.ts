import type { Checkin } from "@/core/entities/checkin.entity";
import type { LocationId, RunId } from "@/core/types/identifiers.type";

export interface CheckinRepositoryPort {
  create(checkin: Checkin): Promise<Checkin>;
  listByRunId(runId: RunId): Promise<readonly Checkin[]>;
  findByRunAndLocation(runId: RunId, locationId: LocationId): Promise<Checkin | null>;
}
