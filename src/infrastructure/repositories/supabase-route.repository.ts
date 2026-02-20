import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { Route } from "@/core/entities/route.entity";
import type { RouteId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { toRouteEntity } from "@/infrastructure/mappers/route.mapper";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteRow = Tables["routes"]["Row"];

export class SupabaseRouteRepository implements RouteRepositoryPort {
  public constructor(private readonly supabase: SupabaseClient<Database>) {}

  public async findById(id: RouteId): Promise<Route | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routes)
      .select("id, slug, name, description, is_active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch route by id.",
        {
          repository: "SupabaseRouteRepository",
          operation: "findById",
          metadata: {
            routeId: id
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return toRouteEntity(data as RouteRow);
  }

  public async findActiveBySlug(slug: string): Promise<Route | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routes)
      .select("id, slug, name, description, is_active, created_at, updated_at")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch route by slug.",
        {
          repository: "SupabaseRouteRepository",
          operation: "findActiveBySlug",
          metadata: {
            routeSlug: slug
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return toRouteEntity(data as RouteRow);
  }

  public async listActive(): Promise<readonly Route[]> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routes)
      .select("id, slug, name, description, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error !== null) {
      throw new RepositoryError(
        "Failed to list active routes.",
        {
          repository: "SupabaseRouteRepository",
          operation: "listActive"
        },
        error
      );
    }

    return data.map((routeRow): Route => toRouteEntity(routeRow as RouteRow));
  }
}
