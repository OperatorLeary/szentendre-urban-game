import type { Location } from "@/core/entities/location.entity";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { LocationId, RunId } from "@/core/types/identifiers.type";

export interface GameSessionSnapshot {
  readonly runId: RunId;
  readonly runStatus: RunStatus;
  readonly startSequenceIndex: number;
  readonly currentSequenceIndex: number;
  readonly totalLocations: number;
  readonly completedLocations: number;
  readonly completedLocationIds: readonly LocationId[];
  readonly nextLocation: Location | null;
  readonly completionRatio: number;
  readonly completionPercentage: number;
  readonly isCompleted: boolean;
}
