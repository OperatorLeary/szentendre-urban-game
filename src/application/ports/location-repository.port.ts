import type { Location } from "@/core/entities/location.entity";
import type { LocationId } from "@/core/types/identifiers.type";

export interface LocationRepositoryPort {
  findById(id: LocationId): Promise<Location | null>;
  listActiveLocations(): Promise<readonly Location[]>;
}
