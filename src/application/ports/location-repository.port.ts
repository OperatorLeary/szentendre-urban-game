import type { Location } from "@/core/entities/location.entity";
import type { LocationId, RouteId } from "@/core/types/identifiers.type";

export interface LocationRepositoryPort {
  findById(id: LocationId, routeId: RouteId): Promise<Location | null>;
  findBySlug(routeId: RouteId, locationSlug: string): Promise<Location | null>;
  listByRoute(routeId: RouteId): Promise<readonly Location[]>;
}
