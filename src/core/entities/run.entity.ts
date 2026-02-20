import {
  MAX_PLAYER_ALIAS_LENGTH,
  MIN_PLAYER_ALIAS_LENGTH
} from "@/core/constants/domain.constants";
import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { LocationId, RouteId, RunId } from "@/core/types/identifiers.type";
import {
  assertPositiveInteger,
  assertValidDate,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";
import { validatePlayerAlias } from "@/core/validation/player-alias-policy";

export interface RunProps {
  readonly id: RunId;
  readonly routeId: RouteId;
  readonly playerAlias: string;
  readonly startLocationId: LocationId | null;
  readonly currentSequenceIndex: number;
  readonly status: RunStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export class Run extends Entity<RunId> {
  public readonly routeId: RouteId;
  public readonly playerAlias: string;
  public readonly startLocationId: LocationId | null;
  public readonly currentSequenceIndex: number;
  public readonly status: RunStatus;
  public readonly startedAt: Date;
  public readonly completedAt: Date | null;

  public constructor(props: RunProps) {
    super(props.id);

    const normalizedAlias: string = normalizeNonEmptyText(
      props.playerAlias,
      "playerAlias",
      MIN_PLAYER_ALIAS_LENGTH,
      MAX_PLAYER_ALIAS_LENGTH
    );
    const aliasValidation = validatePlayerAlias(normalizedAlias);
    if (!aliasValidation.isValid) {
      throw new DomainError("playerAlias contains blocked or unsafe content.", {
        context: {
          reason: aliasValidation.reason
        }
      });
    }

    assertPositiveInteger(props.currentSequenceIndex, "currentSequenceIndex");
    assertValidDate(props.startedAt, "runStartedAt");
    if (props.completedAt !== null) {
      assertValidDate(props.completedAt, "runCompletedAt");
    }

    if (props.status === RunStatus.Completed && props.completedAt === null) {
      throw new DomainError("completedAt is required for completed runs.");
    }

    if (
      props.completedAt !== null &&
      props.completedAt.getTime() < props.startedAt.getTime()
    ) {
      throw new DomainError("completedAt cannot be before startedAt.");
    }

    this.routeId = props.routeId;
    this.playerAlias = normalizedAlias;
    this.startLocationId = props.startLocationId;
    this.currentSequenceIndex = props.currentSequenceIndex;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
  }

  public withCurrentSequenceIndex(currentSequenceIndex: number): Run {
    return new Run({
      id: this.id,
      routeId: this.routeId,
      playerAlias: this.playerAlias,
      startLocationId: this.startLocationId,
      currentSequenceIndex,
      startedAt: this.startedAt,
      status: this.status,
      completedAt: this.completedAt
    });
  }

  public complete(completedAt: Date): Run {
    return new Run({
      id: this.id,
      routeId: this.routeId,
      playerAlias: this.playerAlias,
      startLocationId: this.startLocationId,
      currentSequenceIndex: this.currentSequenceIndex,
      startedAt: this.startedAt,
      status: RunStatus.Completed,
      completedAt
    });
  }

  public abandon(completedAt: Date): Run {
    return new Run({
      id: this.id,
      routeId: this.routeId,
      playerAlias: this.playerAlias,
      startLocationId: this.startLocationId,
      currentSequenceIndex: this.currentSequenceIndex,
      startedAt: this.startedAt,
      status: RunStatus.Abandoned,
      completedAt
    });
  }
}
