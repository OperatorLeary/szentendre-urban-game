import {
  MAX_PLAYER_ALIAS_LENGTH,
  MIN_PLAYER_ALIAS_LENGTH
} from "@/core/constants/domain.constants";
import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { RunId } from "@/core/types/identifiers.type";
import {
  assertValidDate,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

export interface RunProps {
  readonly id: RunId;
  readonly playerAlias: string;
  readonly status: RunStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export class Run extends Entity<RunId> {
  public readonly playerAlias: string;
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

    this.playerAlias = normalizedAlias;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
  }

  public complete(completedAt: Date): Run {
    return new Run({
      id: this.id,
      playerAlias: this.playerAlias,
      startedAt: this.startedAt,
      status: RunStatus.Completed,
      completedAt
    });
  }

  public abandon(completedAt: Date): Run {
    return new Run({
      id: this.id,
      playerAlias: this.playerAlias,
      startedAt: this.startedAt,
      status: RunStatus.Abandoned,
      completedAt
    });
  }
}
