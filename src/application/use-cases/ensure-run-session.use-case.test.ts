import { describe, expect, it } from "vitest";

import type { CheckinRepositoryPort } from "@/application/ports/checkin-repository.port";
import type { ClockPort } from "@/application/ports/clock.port";
import type { LocationRepositoryPort } from "@/application/ports/location-repository.port";
import type { LoggerPort } from "@/application/ports/logger.port";
import type { RouteRepositoryPort } from "@/application/ports/route-repository.port";
import type { RunRepositoryPort } from "@/application/ports/run-repository.port";
import { EnsureRunSessionUseCase } from "@/application/use-cases/ensure-run-session.use-case";
import { APP_ERROR_CODES } from "@/core/errors/error-codes";
import { GameSessionService } from "@/core/services/game-session.service";
import type { Checkin } from "@/core/entities/checkin.entity";
import type { Location } from "@/core/entities/location.entity";
import type { Route } from "@/core/entities/route.entity";
import { Run } from "@/core/entities/run.entity";
import { RunStatus } from "@/core/enums/run-status.enum";
import type { RouteId, RunId } from "@/core/types/identifiers.type";
import {
  createLocation,
  createRoute,
  createRun
} from "@/test/test-factories";

interface TestRunRepository extends RunRepositoryPort {
  readonly createdRuns: Run[];
  readonly updatedRuns: Run[];
}

function createRunRepository(initialActiveRun: Run | null): TestRunRepository {
  let activeRun: Run | null = initialActiveRun;
  const createdRuns: Run[] = [];
  const updatedRuns: Run[] = [];

  return {
    createdRuns,
    updatedRuns,
    findById: (id: RunId) => Promise.resolve(activeRun?.id === id ? activeRun : null),
    findActiveForCurrentDevice: () => Promise.resolve(activeRun),
    create: (run: Run) => {
      createdRuns.push(run);
      activeRun = run.status === RunStatus.Active ? run : activeRun;
      return Promise.resolve(run);
    },
    update: (run: Run) => {
      updatedRuns.push(run);
      if (activeRun?.id === run.id) {
        activeRun = run.status === RunStatus.Active ? run : null;
      }
      return Promise.resolve(run);
    }
  };
}

function createRouteRepository(routes: readonly Route[]): RouteRepositoryPort {
  return {
    findById: (id: RouteId) =>
      Promise.resolve(routes.find((route) => route.id === id) ?? null),
    findActiveBySlug: (slug: string) =>
      Promise.resolve(routes.find((route) => route.slug === slug && route.isActive) ?? null),
    listActive: () => Promise.resolve(routes.filter((route) => route.isActive))
  };
}

function createLocationRepository(
  map: ReadonlyMap<RouteId, readonly Location[]>
): LocationRepositoryPort {
  return {
    findById: (id, routeId) =>
      Promise.resolve(map.get(routeId)?.find((location) => location.id === id) ?? null),
    findBySlug: (routeId, locationSlug) =>
      Promise.resolve(
        map.get(routeId)?.find((location) => location.slug === locationSlug) ?? null
      ),
    listByRoute: (routeId) => Promise.resolve(map.get(routeId) ?? [])
  };
}

function createCheckinRepository(
  checkinMap: ReadonlyMap<RunId, readonly Checkin[]> = new Map()
): CheckinRepositoryPort {
  return {
    create: () => {
      throw new Error("Not implemented for this test.");
    },
    listByRunId: (runId: RunId) => Promise.resolve(checkinMap.get(runId) ?? []),
    findByRunAndLocation: () => Promise.resolve(null)
  };
}

const logger: LoggerPort = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const clock: ClockPort = {
  now: () => new Date("2026-02-21T10:05:00.000Z")
};

function createUseCase(input: {
  readonly runRepository: RunRepositoryPort;
  readonly routeRepository: RouteRepositoryPort;
  readonly locationRepository: LocationRepositoryPort;
  readonly checkinRepository: CheckinRepositoryPort;
}): EnsureRunSessionUseCase {
  return new EnsureRunSessionUseCase({
    runRepository: input.runRepository,
    routeRepository: input.routeRepository,
    locationRepository: input.locationRepository,
    checkinRepository: input.checkinRepository,
    gameSessionService: new GameSessionService(),
    logger,
    clock
  });
}

describe("EnsureRunSessionUseCase", () => {
  it("restarts same-route run from requested QR location when preferRequestedStart is true", async () => {
    const longRoute = createRoute({ id: "route-long", slug: "long" });
    const longLocations = [
      createLocation({ sequenceNumber: 1 }),
      createLocation({ sequenceNumber: 2 }),
      createLocation({ sequenceNumber: 3 }),
      createLocation({ sequenceNumber: 4 }),
      createLocation({ sequenceNumber: 5 })
    ];
    const existingRun = createRun({
      id: "run-active",
      routeId: "route-long",
      startLocationId: "location-01",
      currentSequenceIndex: 2
    });
    const runRepository = createRunRepository(existingRun);
    const useCase = createUseCase({
      runRepository,
      routeRepository: createRouteRepository([longRoute]),
      locationRepository: createLocationRepository(new Map([[longRoute.id, longLocations]])),
      checkinRepository: createCheckinRepository()
    });

    const result = await useCase.execute({
      routeSlug: "long",
      locationSlug: "station-05",
      playerAlias: "player-one",
      preferRequestedStart: true,
      routeProfile: "short"
    });

    expect(runRepository.updatedRuns).toHaveLength(1);
    expect(runRepository.updatedRuns[0]?.status).toBe(RunStatus.Abandoned);
    expect(runRepository.createdRuns).toHaveLength(1);
    expect(result.run.startLocationId).toBe(longLocations[4]?.id);
    expect(result.run.currentSequenceIndex).toBe(5);
    expect(result.session.startSequenceIndex).toBe(5);
    expect(result.session.totalLocations).toBe(3);
  });

  it("keeps active same-route run when preferRequestedStart is false", async () => {
    const longRoute = createRoute({ id: "route-long", slug: "long" });
    const longLocations = [
      createLocation({ sequenceNumber: 1 }),
      createLocation({ sequenceNumber: 2 }),
      createLocation({ sequenceNumber: 3 }),
      createLocation({ sequenceNumber: 4 }),
      createLocation({ sequenceNumber: 5 })
    ];
    const existingRun = createRun({
      id: "run-active",
      routeId: "route-long",
      startLocationId: "location-01",
      currentSequenceIndex: 2
    });
    const runRepository = createRunRepository(existingRun);
    const useCase = createUseCase({
      runRepository,
      routeRepository: createRouteRepository([longRoute]),
      locationRepository: createLocationRepository(new Map([[longRoute.id, longLocations]])),
      checkinRepository: createCheckinRepository()
    });

    const result = await useCase.execute({
      routeSlug: "long",
      locationSlug: "station-05",
      playerAlias: "player-one",
      preferRequestedStart: false
    });

    expect(result.run.id).toBe(existingRun.id);
    expect(runRepository.updatedRuns).toHaveLength(0);
    expect(runRepository.createdRuns).toHaveLength(0);
  });

  it("throws route conflict error with active route context when another route is running", async () => {
    const shortRoute = createRoute({ id: "route-short", slug: "short" });
    const longRoute = createRoute({ id: "route-long", slug: "long" });
    const shortLocations = [
      createLocation({ sequenceNumber: 1, id: "short-location-01", slug: "short-station-01" }),
      createLocation({ sequenceNumber: 2, id: "short-location-02", slug: "short-station-02" }),
      createLocation({ sequenceNumber: 3, id: "short-location-03", slug: "short-station-03" })
    ];
    const longLocations = [
      createLocation({ sequenceNumber: 1 }),
      createLocation({ sequenceNumber: 2 }),
      createLocation({ sequenceNumber: 3 })
    ];
    const existingRun = createRun({
      id: "run-active-short",
      routeId: "route-short",
      startLocationId: "short-location-01",
      currentSequenceIndex: 2
    });
    const useCase = createUseCase({
      runRepository: createRunRepository(existingRun),
      routeRepository: createRouteRepository([shortRoute, longRoute]),
      locationRepository: createLocationRepository(
        new Map([
          [shortRoute.id, shortLocations],
          [longRoute.id, longLocations]
        ])
      ),
      checkinRepository: createCheckinRepository()
    });

    await expect(
      useCase.execute({
        routeSlug: "long",
        locationSlug: "station-01",
        playerAlias: "player-one"
      })
    ).rejects.toMatchObject({
      errorCode: APP_ERROR_CODES.activeRunConflictOtherRoute,
      context: {
        activeRouteSlug: "short",
        activeNextLocationSlug: "short-station-02"
      }
    });
  });
});
