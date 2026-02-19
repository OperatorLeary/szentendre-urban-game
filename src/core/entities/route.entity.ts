import {
  MAX_ROUTE_NAME_LENGTH,
  MAX_ROUTE_SLUG_LENGTH,
  MIN_ROUTE_NAME_LENGTH,
  MIN_ROUTE_SLUG_LENGTH
} from "@/core/constants/domain.constants";
import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import type { RouteId } from "@/core/types/identifiers.type";
import {
  assertCondition,
  assertValidDate,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

const ROUTE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface RouteProps {
  readonly id: RouteId;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Route extends Entity<RouteId> {
  public readonly slug: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  public constructor(props: RouteProps) {
    super(props.id);

    const normalizedSlug: string = normalizeNonEmptyText(
      props.slug,
      "routeSlug",
      MIN_ROUTE_SLUG_LENGTH,
      MAX_ROUTE_SLUG_LENGTH
    ).toLowerCase();
    const normalizedName: string = normalizeNonEmptyText(
      props.name,
      "routeName",
      MIN_ROUTE_NAME_LENGTH,
      MAX_ROUTE_NAME_LENGTH
    );

    if (!ROUTE_SLUG_PATTERN.test(normalizedSlug)) {
      throw new DomainError("routeSlug has invalid format.");
    }

    assertValidDate(props.createdAt, "routeCreatedAt");
    assertValidDate(props.updatedAt, "routeUpdatedAt");
    assertCondition(
      props.updatedAt.getTime() >= props.createdAt.getTime(),
      "routeUpdatedAt cannot be before routeCreatedAt."
    );

    this.slug = normalizedSlug;
    this.name = normalizedName;
    this.description = props.description?.trim() ?? null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
