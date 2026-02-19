import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { Location } from "@/core/entities/location.entity";
import type { LocationId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { toLocationEntity } from "@/infrastructure/mappers/location.mapper";
import { DefaultRouteResolver } from "@/infrastructure/runtime/default-route-resolver";
import type { Tables } from "@/infrastructure/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";

type RouteLocationRow = Tables["route_locations"]["Row"];
type LocationRow = Tables["locations"]["Row"];

export class SupabaseLocationRepository implements LocationRepositoryPort {
  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly defaultRouteResolver: DefaultRouteResolver,
    private readonly logger: LoggerPort
  ) {}

  public async findById(id: LocationId): Promise<Location | null> {
    const routeId: string = await this.defaultRouteResolver.getDefaultRouteId();

    const { data: routeLocation, error: routeLocationError } = await this.supabase
      .from(SUPABASE_TABLES.routeLocations)
      .select("location_id, sequence_index")
      .eq("route_id", routeId)
      .eq("location_id", id)
      .maybeSingle();

    if (routeLocationError !== null) {
      throw new RepositoryError(
        "Failed to fetch route location mapping.",
        {
          repository: "SupabaseLocationRepository",
          operation: "findById.routeLocation",
          metadata: {
            routeId,
            locationId: id
          }
        },
        routeLocationError
      );
    }

    if (routeLocation === null) {
      return null;
    }

    const { data: locationRow, error: locationError } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(
        "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, expected_answer, is_active, created_at, updated_at"
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (locationError !== null) {
      throw new RepositoryError(
        "Failed to fetch location.",
        {
          repository: "SupabaseLocationRepository",
          operation: "findById.location",
          metadata: {
            locationId: id
          }
        },
        locationError
      );
    }

    if (locationRow === null) {
      return null;
    }

    return toLocationEntity(
      locationRow as LocationRow,
      routeLocation.sequence_index
    );
  }

  public async listActiveLocations(): Promise<readonly Location[]> {
    const routeId: string = await this.defaultRouteResolver.getDefaultRouteId();

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
          operation: "listActiveLocations.routeLocations",
          metadata: {
            routeId
          }
        },
        routeLocationError
      );
    }

    const mappings: readonly Pick<RouteLocationRow, "location_id" | "sequence_index">[] =
      routeLocationRows ?? [];
    if (mappings.length === 0) {
      return [];
    }

    const locationIds: readonly string[] = mappings.map(
      (mapping): string => mapping.location_id
    );

    const { data: locationRows, error: locationError } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(
        "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, expected_answer, is_active, created_at, updated_at"
      )
      .in("id", [...locationIds])
      .eq("is_active", true);

    if (locationError !== null) {
      throw new RepositoryError(
        "Failed to fetch active locations.",
        {
          repository: "SupabaseLocationRepository",
          operation: "listActiveLocations.locations",
          metadata: {
            routeId
          }
        },
        locationError
      );
    }

    const locationMap = new Map<string, LocationRow>(
      (locationRows ?? []).map((row): readonly [string, LocationRow] => [
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
}
