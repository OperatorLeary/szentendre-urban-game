import type { Checkin } from "@/core/entities/checkin.entity";
import type { Location } from "@/core/entities/location.entity";
import type { Run } from "@/core/entities/run.entity";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { CheckinEligibility } from "@/core/models/checkin-eligibility.model";
import type { GameSessionSnapshot } from "@/core/models/game-session.model";
import type { LocationId } from "@/core/types/identifiers.type";
import { ProgressTrackingService } from "@/core/services/progress-tracking.service";

export interface GameSessionInput {
  readonly run: Run;
  readonly locations: readonly Location[];
  readonly checkins: readonly Checkin[];
}

export interface CheckinEligibilityInput {
  readonly run: Run;
  readonly targetLocation: Location;
  readonly locations: readonly Location[];
  readonly checkins: readonly Checkin[];
}

export class GameSessionService {
  public constructor(
    private readonly progressTrackingService: ProgressTrackingService = new ProgressTrackingService()
  ) {}

  public buildSnapshot(input: GameSessionInput): GameSessionSnapshot {
    const orderedActiveLocations: readonly Location[] =
      this.getOrderedActiveLocations(input.locations);
    const completedLocationIdSet: Set<LocationId> = this.getCompletedLocationIdSet(
      input.run.id,
      input.checkins
    );
    const completedLocationIds: readonly LocationId[] = orderedActiveLocations
      .filter((location: Location): boolean => completedLocationIdSet.has(location.id))
      .map((location: Location): LocationId => location.id);
    const nextLocation: Location | null =
      orderedActiveLocations.find(
        (location: Location): boolean => !completedLocationIdSet.has(location.id)
      ) ?? null;
    const progress = this.progressTrackingService.calculate(
      orderedActiveLocations.length,
      completedLocationIds.length
    );

    return {
      runId: input.run.id,
      runStatus: input.run.status,
      totalLocations: progress.totalSteps,
      completedLocations: progress.completedSteps,
      completedLocationIds,
      nextLocation,
      completionRatio: progress.completionRatio,
      completionPercentage: progress.completionPercentage,
      isCompleted:
        input.run.status === RunStatus.Completed || progress.isCompleted
    };
  }

  public evaluateCheckinEligibility(
    input: CheckinEligibilityInput
  ): CheckinEligibility {
    if (input.run.status !== RunStatus.Active) {
      return {
        isAllowed: false,
        reason: "run_not_active"
      };
    }

    if (!input.targetLocation.isActive) {
      return {
        isAllowed: false,
        reason: "location_inactive"
      };
    }

    const completedLocationIdSet: Set<LocationId> = this.getCompletedLocationIdSet(
      input.run.id,
      input.checkins
    );

    if (completedLocationIdSet.has(input.targetLocation.id)) {
      return {
        isAllowed: false,
        reason: "already_checked_in"
      };
    }

    const sessionSnapshot: GameSessionSnapshot = this.buildSnapshot({
      run: input.run,
      locations: input.locations,
      checkins: input.checkins
    });

    if (sessionSnapshot.nextLocation?.id !== input.targetLocation.id) {
      return {
        isAllowed: false,
        reason: "out_of_order"
      };
    }

    return {
      isAllowed: true,
      reason: "allowed"
    };
  }

  private getOrderedActiveLocations(locations: readonly Location[]): readonly Location[] {
    return [...locations]
      .filter((location: Location): boolean => location.isActive)
      .sort(Location.compareBySequence);
  }

  private getCompletedLocationIdSet(
    runId: Run["id"],
    checkins: readonly Checkin[]
  ): Set<LocationId> {
    const completedLocationIds = checkins
      .filter((checkin: Checkin): boolean => checkin.runId === runId)
      .map((checkin: Checkin): LocationId => checkin.locationId);

    return new Set<LocationId>(completedLocationIds);
  }
}
