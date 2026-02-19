import { Route } from "@/core/entities/route.entity";
import { toRouteId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type RouteRow = Tables["routes"]["Row"];

export function toRouteEntity(row: RouteRow): Route {
  try {
    return new Route({
      id: toRouteId(row.id),
      slug: row.slug,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      createdAt: parseIsoDate(row.created_at, "RouteMapper", "routes.created_at"),
      updatedAt: parseIsoDate(row.updated_at, "RouteMapper", "routes.updated_at")
    });
  } catch (error) {
    throw new RepositoryError(
      "Failed to map route row to entity.",
      {
        repository: "RouteMapper",
        operation: "toRouteEntity",
        metadata: {
          routeId: row.id
        }
      },
      error
    );
  }
}
