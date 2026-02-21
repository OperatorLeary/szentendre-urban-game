import { describe, expect, it } from "vitest";

import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import { ResolveQrEntryRouteUseCase } from "@/application/use-cases/resolve-qr-entry-route.use-case";
import type { Location } from "@/core/entities/location.entity";
import type { Route } from "@/core/entities/route.entity";
import type { RouteId } from "@/core/types/identifiers.type";
import { createLocation, createRoute } from "@/test/test-factories";

function createRouteLocations(total: number, sharedSlug: string): readonly Location[] {
  const locations: Location[] = [];
  for (let sequence = 1; sequence <= total; sequence += 1) {
    const totalLabel = String(total);
    const sequenceLabel = String(sequence);
    locations.push(
      createLocation({
        sequenceNumber: sequence,
        id: `${sharedSlug}-${totalLabel}-${sequenceLabel}`,
        slug:
          sequence === 1
            ? sharedSlug
            : `${sharedSlug}-${totalLabel}-${sequenceLabel}`
      })
    );
  }

  return locations;
}

function createRouteRepository(routes: readonly Route[]): RouteRepositoryPort {
  return {
    findById: () => Promise.resolve(null),
    findActiveBySlug: () => Promise.resolve(null),
    listActive: () => Promise.resolve(routes)
  };
}

function createLocationRepository(
  routeLocationMap: ReadonlyMap<RouteId, readonly Location[]>
): LocationRepositoryPort {
  return {
    findById: () => Promise.resolve(null),
    findBySlug: (routeId: RouteId, locationSlug: string) =>
      Promise.resolve(
        routeLocationMap
          .get(routeId)
          ?.find((location: Location): boolean => location.slug === locationSlug) ?? null
      ),
    listByRoute: (routeId: RouteId) => Promise.resolve(routeLocationMap.get(routeId) ?? [])
  };
}

describe("ResolveQrEntryRouteUseCase", () => {
  it("selects the shortest compatible route for the requested profile", async () => {
    const shortRoute = createRoute({ id: "route-short", slug: "short" });
    const mediumRoute = createRoute({ id: "route-medium", slug: "medium" });
    const longRoute = createRoute({ id: "route-long", slug: "long" });
    const sharedSlug = "shared-station";
    const locationRepository = createLocationRepository(
      new Map([
        [shortRoute.id, createRouteLocations(3, sharedSlug)],
        [mediumRoute.id, createRouteLocations(12, sharedSlug)],
        [longRoute.id, createRouteLocations(24, sharedSlug)]
      ])
    );
    const useCase = new ResolveQrEntryRouteUseCase({
      routeRepository: createRouteRepository([shortRoute, mediumRoute, longRoute]),
      locationRepository
    });

    const response = await useCase.execute({
      scannedRouteSlug: "long",
      locationSlug: sharedSlug,
      desiredProfile: "medium"
    });

    expect(response.routeSlug).toBe("medium");
    expect(response.matchedRouteSlugs).toEqual(["short", "medium", "long"]);
  });

  it("falls back to the largest available candidate when desired profile cannot be satisfied", async () => {
    const shortRoute = createRoute({ id: "route-short", slug: "short" });
    const mediumRoute = createRoute({ id: "route-medium", slug: "medium" });
    const sharedSlug = "shared-station";
    const useCase = new ResolveQrEntryRouteUseCase({
      routeRepository: createRouteRepository([shortRoute, mediumRoute]),
      locationRepository: createLocationRepository(
        new Map([
          [shortRoute.id, createRouteLocations(3, sharedSlug)],
          [mediumRoute.id, createRouteLocations(12, sharedSlug)]
        ])
      )
    });

    const response = await useCase.execute({
      scannedRouteSlug: "long",
      locationSlug: sharedSlug,
      desiredProfile: "long"
    });

    expect(response.routeSlug).toBe("medium");
    expect(response.matchedRouteSlugs).toEqual(["short", "medium"]);
  });

  it("returns scanned route when no active route contains the scanned location", async () => {
    const shortRoute = createRoute({ id: "route-short", slug: "short" });
    const useCase = new ResolveQrEntryRouteUseCase({
      routeRepository: createRouteRepository([shortRoute]),
      locationRepository: createLocationRepository(
        new Map([[shortRoute.id, createRouteLocations(3, "different-station")]])
      )
    });

    const response = await useCase.execute({
      scannedRouteSlug: "long",
      locationSlug: "missing-station",
      desiredProfile: "short"
    });

    expect(response.routeSlug).toBe("long");
    expect(response.matchedRouteSlugs).toEqual([]);
  });
});
