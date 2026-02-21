import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import type { Route } from "@/core/entities/route.entity";

export interface RouteOverview {
  readonly id: Route["id"];
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly firstLocationSlug: string | null;
  readonly locationCount: number;
  readonly estimatedDurationMinutes: number;
}

export type ListRoutesRequest = Record<string, never>;

export type ListRoutesResponse = readonly RouteOverview[];

interface ListRoutesDependencies {
  readonly routeRepository: RouteRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
}

function estimateDurationMinutes(locationCount: number): number {
  const normalizedLocationCount = Math.max(locationCount, 1);
  return Math.max(12, Math.round(normalizedLocationCount * 7.5));
}

export class ListRoutesUseCase
  implements UseCase<ListRoutesRequest, Promise<ListRoutesResponse>>
{
  public constructor(private readonly dependencies: ListRoutesDependencies) {}

  public async execute(request: ListRoutesRequest): Promise<ListRoutesResponse> {
    void request;
    const routes: readonly Route[] = await this.dependencies.routeRepository.listActive();

    const routeOverviews: readonly RouteOverview[] = await Promise.all(
      routes.map(async (route: Route): Promise<RouteOverview> => {
        const locations = await this.dependencies.locationRepository.listByRoute(route.id);
        const firstLocationSlug: string | null = locations[0]?.slug ?? null;
        const locationCount: number = locations.length;

        return {
          id: route.id,
          slug: route.slug,
          name: route.name,
          description: route.description,
          firstLocationSlug,
          locationCount,
          estimatedDurationMinutes: estimateDurationMinutes(locationCount)
        };
      })
    );

    return routeOverviews;
  }
}
