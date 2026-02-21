import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { UseCase } from "@/application/use-cases/use-case.contract";
import {
  type QrRouteProfile,
  parseQrRouteProfile,
  resolveQrRouteProfileTargetCount
} from "@/core/constants/route-profile.constants";
import type { Location } from "@/core/entities/location.entity";
import type { Route } from "@/core/entities/route.entity";

export interface ResolveQrEntryRouteRequest {
  readonly scannedRouteSlug: string;
  readonly locationSlug: string;
  readonly desiredProfile?: QrRouteProfile | null;
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

interface SortCandidatesInput {
  readonly scannedRouteSlug: string;
  readonly preferShortest: boolean;
}

function sortCandidates(
  candidates: RouteCandidate[],
  input: SortCandidatesInput
): RouteCandidate[] {
  return [...candidates].sort((left: RouteCandidate, right: RouteCandidate): number => {
    if (left.locationCount !== right.locationCount) {
      return input.preferShortest
        ? left.locationCount - right.locationCount
        : right.locationCount - left.locationCount;
    }

    const leftMatchesScannedRoute = left.route.slug === input.scannedRouteSlug;
    const rightMatchesScannedRoute = right.route.slug === input.scannedRouteSlug;
    if (leftMatchesScannedRoute !== rightMatchesScannedRoute) {
      return leftMatchesScannedRoute ? -1 : 1;
    }

    return left.route.slug.localeCompare(right.route.slug);
  });
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
    const normalizedDesiredProfile: QrRouteProfile | null = parseQrRouteProfile(
      request.desiredProfile ?? null
    );
    const desiredTargetCount: number | null =
      resolveQrRouteProfileTargetCount(normalizedDesiredProfile);
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

    const bestRouteCandidates: RouteCandidate[] =
      desiredTargetCount === null
        ? sortCandidates(candidates, {
            scannedRouteSlug: normalizedScannedRouteSlug,
            preferShortest: true
          })
        : (() => {
            const compatibleCandidates: RouteCandidate[] = candidates.filter(
              (candidate: RouteCandidate): boolean =>
                candidate.locationCount >= desiredTargetCount
            );
            if (compatibleCandidates.length > 0) {
              return sortCandidates(compatibleCandidates, {
                scannedRouteSlug: normalizedScannedRouteSlug,
                preferShortest: true
              });
            }

            return sortCandidates(candidates, {
              scannedRouteSlug: normalizedScannedRouteSlug,
              preferShortest: false
            });
          })();

    return {
      routeSlug: bestRouteCandidates[0]?.route.slug ?? normalizedScannedRouteSlug,
      matchedRouteSlugs: sortCandidates(candidates, {
        scannedRouteSlug: normalizedScannedRouteSlug,
        preferShortest: true
      }).map((candidate: RouteCandidate): string => candidate.route.slug)
    };
  }
}
