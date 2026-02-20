import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { Location } from "@/core/entities/location.entity";
import type { LocationId, RouteId } from "@/core/types/identifiers.type";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import {
  toLocationEntity,
  type RouteStationContentOverrides
} from "@/infrastructure/mappers/location.mapper";
import type { Database, Tables } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteLocationRow = Tables["route_locations"]["Row"];
type LocationRow = Tables["locations"]["Row"];
type RouteStationRow = Tables["route_stations"]["Row"];

const LOCATION_SELECT_FIELDS =
  "id, slug, name, description, latitude, longitude, radius_m, qr_code_value, question_prompt, question_prompt_hu, instruction_brief, instruction_brief_hu, instruction_full, instruction_full_hu, expected_answer, expected_answers, is_active, created_at, updated_at";
const ROUTE_STATION_SELECT_FIELDS =
  "route_id, location_id, question_prompt, question_prompt_hu, instruction_brief, instruction_brief_hu, instruction_full, instruction_full_hu, expected_answer, expected_answers, is_active";

function extractErrorSignal(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return `${error.message} ${extractErrorSignal((error as { cause?: unknown }).cause)}`;
  }

  if (typeof error === "object" && error !== null) {
    const errorLike = error as {
      readonly message?: unknown;
      readonly details?: unknown;
      readonly hint?: unknown;
      readonly code?: unknown;
      readonly cause?: unknown;
    };

    return [
      extractErrorSignal(errorLike.message),
      extractErrorSignal(errorLike.details),
      extractErrorSignal(errorLike.hint),
      extractErrorSignal(errorLike.code),
      extractErrorSignal(errorLike.cause)
    ].join(" ");
  }

  return "";
}

function isRouteStationsSchemaMissing(error: unknown): boolean {
  const signal = extractErrorSignal(error).toLowerCase();
  return (
    signal.includes("route_stations") &&
    (signal.includes("does not exist") ||
      signal.includes("could not find the table") ||
      signal.includes("schema cache"))
  );
}

function toRouteStationOverrides(
  row: Pick<
    RouteStationRow,
    | "question_prompt"
    | "question_prompt_hu"
    | "instruction_brief"
    | "instruction_brief_hu"
    | "instruction_full"
    | "instruction_full_hu"
    | "expected_answer"
    | "expected_answers"
  >
): RouteStationContentOverrides {
  return {
    questionPrompt: row.question_prompt,
    questionPromptHu: row.question_prompt_hu,
    instructionBrief: row.instruction_brief,
    instructionBriefHu: row.instruction_brief_hu,
    instructionFull: row.instruction_full,
    instructionFullHu: row.instruction_full_hu,
    expectedAnswer: row.expected_answer,
    expectedAnswers: row.expected_answers
  };
}

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

    const routeStationContent = await this.getRouteStationContent(routeId, id);
    return toLocationEntity(
      locationRow,
      routeLocation.sequence_index,
      routeStationContent === null ? undefined : toRouteStationOverrides(routeStationContent)
    );
  }

  public async findBySlug(
    routeId: RouteId,
    locationSlug: string
  ): Promise<Location | null> {
    const { data: locationRow, error: locationError } = await this.supabase
      .from(SUPABASE_TABLES.locations)
      .select(LOCATION_SELECT_FIELDS)
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

    const routeStationContent = await this.getRouteStationContent(routeId, locationRow.id);

    return toLocationEntity(
      locationRow as LocationRow,
      routeLocation.sequence_index,
      routeStationContent === null ? undefined : toRouteStationOverrides(routeStationContent)
    );
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
      .select(LOCATION_SELECT_FIELDS)
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
    const routeStationContentMap = await this.getRouteStationContentMap(routeId, locationIds);

    return mappings.flatMap((mapping): readonly Location[] => {
      const locationRow: LocationRow | undefined = locationMap.get(mapping.location_id);
      if (locationRow === undefined) {
        this.logger.warn("Route mapping references a missing location.", {
          routeId,
          locationId: mapping.location_id
        });
        return [];
      }

      const routeStationContent = routeStationContentMap.get(mapping.location_id);
      return [
        toLocationEntity(
          locationRow,
          mapping.sequence_index,
          routeStationContent === undefined
            ? undefined
            : toRouteStationOverrides(routeStationContent)
        )
      ];
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
      .select(LOCATION_SELECT_FIELDS)
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

  private async getRouteStationContent(
    routeId: RouteId,
    locationId: string
  ): Promise<Pick<
    RouteStationRow,
    | "question_prompt"
    | "question_prompt_hu"
    | "instruction_brief"
    | "instruction_brief_hu"
    | "instruction_full"
    | "instruction_full_hu"
    | "expected_answer"
    | "expected_answers"
  > | null> {
    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routeStations)
      .select(ROUTE_STATION_SELECT_FIELDS)
      .eq("route_id", routeId)
      .eq("location_id", locationId)
      .eq("is_active", true)
      .maybeSingle();

    if (error !== null) {
      if (isRouteStationsSchemaMissing(error)) {
        this.logger.warn(
          "route_stations table missing. Falling back to legacy location-level content.",
          {
            routeId,
            locationId
          }
        );
        return null;
      }

      throw new RepositoryError(
        "Failed to fetch route station content.",
        {
          repository: "SupabaseLocationRepository",
          operation: "getRouteStationContent",
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

    return data as Pick<
      RouteStationRow,
      | "question_prompt"
      | "question_prompt_hu"
      | "instruction_brief"
      | "instruction_brief_hu"
      | "instruction_full"
      | "instruction_full_hu"
      | "expected_answer"
      | "expected_answers"
    >;
  }

  private async getRouteStationContentMap(
    routeId: RouteId,
    locationIds: readonly string[]
  ): Promise<
    ReadonlyMap<
      string,
      Pick<
        RouteStationRow,
        | "question_prompt"
        | "question_prompt_hu"
        | "instruction_brief"
        | "instruction_brief_hu"
        | "instruction_full"
        | "instruction_full_hu"
        | "expected_answer"
        | "expected_answers"
      >
    >
  > {
    if (locationIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routeStations)
      .select(ROUTE_STATION_SELECT_FIELDS)
      .eq("route_id", routeId)
      .eq("is_active", true)
      .in("location_id", [...locationIds]);

    if (error !== null) {
      if (isRouteStationsSchemaMissing(error)) {
        this.logger.warn(
          "route_stations table missing. Falling back to legacy location-level content.",
          {
            routeId
          }
        );
        return new Map();
      }

      throw new RepositoryError(
        "Failed to list route station content.",
        {
          repository: "SupabaseLocationRepository",
          operation: "getRouteStationContentMap",
          metadata: {
            routeId,
            locationCount: locationIds.length
          }
        },
        error
      );
    }

    if (data.length === 0) {
      return new Map();
    }

    return new Map(
      data.map((row): readonly [string, typeof row] => [row.location_id, row])
    );
  }
}
