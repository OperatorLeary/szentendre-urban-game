import type { Route } from "@/core/entities/route.entity";
import type { RouteId } from "@/core/types/identifiers.type";

export interface RouteRepositoryPort {
  findById(id: RouteId): Promise<Route | null>;
  findActiveBySlug(slug: string): Promise<Route | null>;
  listActive(): Promise<readonly Route[]>;
}
