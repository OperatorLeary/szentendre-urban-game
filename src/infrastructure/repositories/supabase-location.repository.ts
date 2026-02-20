import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { Location } from "@/core/entities/location.entity";
import type { LocationId, RouteId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { toLocationEntity } from "@/infrastructure/mappers/location.mapper";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteLocationRow = Tables["route_locations"]["Row"];
type LocationRow = Tables["locations"]["Row"];

export class SupabaseLocationRepository implements LocationRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: LoggerPort
  ) {}

  public async findById(id: LocationId, routeId: RouteId): Promise<Location | null> {
    const routeLocation = await this.getRouteLocation(routeId, id);
    if (routeLocation === null) {
      return null;
    }

    const locationRow: LocationRow | null = await this.getActiveLocationById(id);
    if (locationRow === null) {
      return null;
    }

    return toLocationEntity(locationRow, routeLocation.sequence_index);
  }

  public async findBySlug(
    routeId: RouteId,
    locationSlug: string
  ): Promise<Location | null> {
    const { data: locationRow, error: locationError } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(
        "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, question_prompt_hu, expected_answer, expected_answers, is_active, created_at, updated_at"
      )
      .eq("slug", locationSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (locationError !== null) {
      throw new RepositoryError(
        "Failed to fetch location by slug.",
        {
          repository: "SupabaseLocationRepository",
          operation: "findBySlug.location",
          metadata: {
            routeId,
            locationSlug
          }
        },
        locationError
      );
    }

    if (locationRow === null) {
      return null;
    }

    const routeLocation: Pick<RouteLocationRow, "sequence_index"> | null =
      await this.getRouteLocation(routeId, locationRow.id);
    if (routeLocation === null) {
      return null;
    }

    return toLocationEntity(locationRow as LocationRow, routeLocation.sequence_index);
  }

  public async listByRoute(routeId: RouteId): Promise<readonly Location[]> {
    const { data: routeLocationRows, error: routeLocationError } = await this.supabase
      .from(SUPABASE_TABLES.routeLocations)
      .select("location_id, sequence_index")
      .eq("route_id", routeId)
      .order("sequence_index", { ascending: true });

    if (routeLocationError !== null) {
      throw new RepositoryError(
        "Failed to fetch route location mappings.",
        {
          repository: "SupabaseLocationRepository",
          operation: "listByRoute.routeLocations",
          metadata: {
            routeId
          }
        },
        routeLocationError
      );
    }

    const mappings: readonly Pick<RouteLocationRow, "location_id" | "sequence_index">[] =
      routeLocationRows;
    if (mappings.length === 0) {
      return [];
    }

    const locationIds: readonly string[] = mappings.map(
      (mapping): string => mapping.location_id
    );

    const { data: locationRows, error: locationError } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(
        "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, question_prompt_hu, expected_answer, expected_answers, is_active, created_at, updated_at"
      )
      .in("id", [...locationIds])
      .eq("is_active", true);

    if (locationError !== null) {
      throw new RepositoryError(
        "Failed to fetch route locations.",
        {
          repository: "SupabaseLocationRepository",
          operation: "listByRoute.locations",
          metadata: {
            routeId
          }
        },
        locationError
      );
    }

    const locationMap = new Map<string, LocationRow>(
      locationRows.map((row): readonly [string, LocationRow] => [
        row.id,
        row as LocationRow
      ])
    );

    return mappings.flatMap((mapping): readonly Location[] => {
      const locationRow: LocationRow | undefined = locationMap.get(mapping.location_id);
      if (locationRow === undefined) {
        this.logger.warn("Route mapping references a missing location.", {
          routeId,
          locationId: mapping.location_id
        });
        return [];
      }

      return [toLocationEntity(locationRow, mapping.sequence_index)];
    });
  }

  private async getRouteLocation(
    routeId: RouteId,
    locationId: string
  ): Promise<Pick<RouteLocationRow, "sequence_index"> | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routeLocations)
      .select("sequence_index")
      .eq("route_id", routeId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch route location mapping.",
        {
          repository: "SupabaseLocationRepository",
          operation: "getRouteLocation",
          metadata: {
            routeId,
            locationId
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return data as Pick<RouteLocationRow, "sequence_index">;
  }

  private async getActiveLocationById(locationId: string): Promise<LocationRow | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(
        "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, question_prompt_hu, expected_answer, expected_answers, is_active, created_at, updated_at"
      )
      .eq("id", locationId)
      .eq("is_active", true)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to fetch location by ID.",
        {
          repository: "SupabaseLocationRepository",
          operation: "getActiveLocationById",
          metadata: {
            locationId
          }
        },
        error
      );
    }

    if (data === null) {
      return null;
    }

    return data as LocationRow;
  }
}
