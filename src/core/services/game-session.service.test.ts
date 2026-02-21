import { describe, expect, it } from "vitest";

import { GameSessionService } from "@/core/services/game-session.service";
import { RunStatus } from "@/core/enums/run-status.enum";
import {
  createGpsCheckin,
  createLocation,
  createRun
} from "@/test/test-factories";

function createOrderedLocations(total: number) {
  return Array.from({ length: total }, (_, index: number) =>
    createLocation({
      sequenceNumber: index + 1
    })
  );
}

describe("GameSessionService", () => {
  it("builds a wrapped route track from an arbitrary start station", () => {
    const service = new GameSessionService();
    const locations = createOrderedLocations(24);
    const run = createRun({
      id: "run-wrap",
      routeId: "route-long",
      startLocationId: "location-24",
      currentSequenceIndex: 24
    });

    const track = service.buildRouteTrackLocations({
      run,
      locations,
      targetLocationCount: 3
    });

    expect(track.map((location) => location.sequenceNumber)).toEqual([24, 1, 2]);
    expect(new Set(track.map((location) => location.id)).size).toBe(3);
  });

  it("marks session complete exactly at selected profile length", () => {
    const service = new GameSessionService();
    const locations = createOrderedLocations(24);
    const run = createRun({
      id: "run-profile",
      routeId: "route-long",
      startLocationId: "location-05",
      currentSequenceIndex: 7,
      status: RunStatus.Active
    });
    const checkins = [
      createGpsCheckin({
        runId: "run-profile",
        locationId: "location-05",
        sequenceIndex: 5
      }),
      createGpsCheckin({
        runId: "run-profile",
        locationId: "location-06",
        sequenceIndex: 6
      }),
      createGpsCheckin({
        runId: "run-profile",
        locationId: "location-07",
        sequenceIndex: 7
      })
    ];

    const snapshot = service.buildSnapshot({
      run,
      locations,
      checkins,
      targetLocationCount: 3
    });

    expect(snapshot.totalLocations).toBe(3);
    expect(snapshot.completedLocations).toBe(3);
    expect(snapshot.isCompleted).toBe(true);
    expect(snapshot.nextLocation).toBeNull();
  });

  it("keeps next location consistent after progressing from late-start track", () => {
    const service = new GameSessionService();
    const locations = createOrderedLocations(24);
    const run = createRun({
      id: "run-next",
      routeId: "route-long",
      startLocationId: "location-24",
      currentSequenceIndex: 1
    });
    const checkins = [
      createGpsCheckin({
        runId: "run-next",
        locationId: "location-24",
        sequenceIndex: 24
      })
    ];

    const snapshot = service.buildSnapshot({
      run,
      locations,
      checkins,
      targetLocationCount: 3
    });

    expect(snapshot.totalLocations).toBe(3);
    expect(snapshot.completedLocations).toBe(1);
    expect(snapshot.nextLocation?.sequenceNumber).toBe(1);
    expect(service.resolveNextSequenceIndex({
      run,
      locations,
      checkins,
      targetLocationCount: 3
    })).toBe(1);
  });
});
