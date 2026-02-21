import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import type { Location } from "@/core/entities/location.entity";
import type { Route } from "@/core/entities/route.entity";

export interface ResolveQrEntryRouteRequest {
  readonly scannedRouteSlug: string;
  readonly locationSlug: string;
}

export interface ResolveQrEntryRouteResponse {
  readonly routeSlug: string;
  readonly matchedRouteSlugs: readonly string[];
}

interface ResolveQrEntryRouteDependencies {
  readonly routeRepository: RouteRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
}

interface RouteCandidate {
  readonly route: Route;
  readonly locationCount: number;
}

export class ResolveQrEntryRouteUseCase
  implements UseCase<ResolveQrEntryRouteRequest, Promise<ResolveQrEntryRouteResponse>>
{
  public constructor(private readonly dependencies: ResolveQrEntryRouteDependencies) {}

  public async execute(
    request: ResolveQrEntryRouteRequest
  ): Promise<ResolveQrEntryRouteResponse> {
    const normalizedLocationSlug: string = request.locationSlug.trim().toLowerCase();
    const normalizedScannedRouteSlug: string = request.scannedRouteSlug.trim().toLowerCase();
    const activeRoutes: readonly Route[] = await this.dependencies.routeRepository.listActive();

    const candidates: RouteCandidate[] = [];
    for (const route of activeRoutes) {
      const location = await this.dependencies.locationRepository.findBySlug(
        route.id,
        normalizedLocationSlug
      );

      if (location === null) {
        continue;
      }

      const routeLocations: readonly Location[] =
        await this.dependencies.locationRepository.listByRoute(route.id);
      candidates.push({
        route,
        locationCount: routeLocations.length
      });
    }

    if (candidates.length === 0) {
      return {
        routeSlug: normalizedScannedRouteSlug,
        matchedRouteSlugs: []
      };
    }

    candidates.sort((left: RouteCandidate, right: RouteCandidate): number => {
      if (left.locationCount !== right.locationCount) {
        return left.locationCount - right.locationCount;
      }

      const leftMatchesScannedRoute = left.route.slug === normalizedScannedRouteSlug;
      const rightMatchesScannedRoute = right.route.slug === normalizedScannedRouteSlug;
      if (leftMatchesScannedRoute !== rightMatchesScannedRoute) {
        return leftMatchesScannedRoute ? -1 : 1;
      }

      return left.route.slug.localeCompare(right.route.slug);
    });

    return {
      routeSlug: candidates[0]?.route.slug ?? normalizedScannedRouteSlug,
      matchedRouteSlugs: candidates.map((candidate: RouteCandidate): string => candidate.route.slug)
    };
  }
}
