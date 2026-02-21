import { Checkin } from "@/core/entities/checkin.entity";
import { Location } from "@/core/entities/location.entity";
import { Route } from "@/core/entities/route.entity";
import { Run } from "@/core/entities/run.entity";
import { CheckinMethod } from "@/core/enums/checkin-method.enum";
import { RunStatus } from "@/core/enums/run-status.enum";
import {
  toCheckinId,
  toLocationId,
  toRouteId,
  toRunId
} from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { QrToken } from "@/core/value-objects/qr-token.vo";

const BASE_DATE = new Date("2026-02-21T10:00:00.000Z");

export function createRoute(input?: {
  readonly id?: string;
  readonly slug?: string;
  readonly name?: string;
}): Route {
  const id = input?.id ?? `route-${input?.slug ?? "long"}`;
  const slug = input?.slug ?? "long";

  return new Route({
    id: toRouteId(id),
    slug,
    name: input?.name ?? `${slug.toUpperCase()} Route`,
    description: `${slug} route`,
    isActive: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE
  });
}

export function createLocation(input: {
  readonly sequenceNumber: number;
  readonly id?: string;
  readonly slug?: string;
  readonly name?: string;
  readonly isActive?: boolean;
}): Location {
  const sequenceLabel = String(input.sequenceNumber).padStart(2, "0");
  const slug = input.slug ?? `station-${sequenceLabel}`;

  return new Location({
    id: toLocationId(input.id ?? `location-${sequenceLabel}`),
    slug,
    name: input.name ?? `Station ${sequenceLabel}`,
    position: new GeoPoint({
      latitude: 47.669 + input.sequenceNumber * 0.0001,
      longitude: 19.074 + input.sequenceNumber * 0.0001
    }),
    validationRadiusMeters: 40,
    sequenceNumber: input.sequenceNumber,
    qrToken: QrToken.create(`/r/long/l/${slug}`),
    questionPrompt: "What is the correct answer?",
    questionPromptHu: "Mi a helyes valasz?",
    instructionBrief: "Walk to the next checkpoint.",
    instructionBriefHu: "Menj a kovetkezo allomasra.",
    instructionFull: "Detailed station instructions for testing the route behavior.",
    instructionFullHu: "Reszletes allomasleiras teszteleshez.",
    expectedAnswers: ["a"],
    isActive: input.isActive ?? true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE
  });
}

export function createRun(input: {
  readonly routeId: string;
  readonly id?: string;
  readonly startLocationId?: string | null;
  readonly currentSequenceIndex?: number;
  readonly status?: RunStatus;
}): Run {
  return new Run({
    id: toRunId(input.id ?? "run-1"),
    routeId: toRouteId(input.routeId),
    playerAlias: "player-one",
    startLocationId:
      input.startLocationId === undefined || input.startLocationId === null
        ? null
        : toLocationId(input.startLocationId),
    currentSequenceIndex: input.currentSequenceIndex ?? 1,
    status: input.status ?? RunStatus.Active,
    startedAt: BASE_DATE,
    completedAt:
      input.status === RunStatus.Completed
        ? new Date(BASE_DATE.getTime() + 10 * 60 * 1000)
        : null
  });
}

export function createGpsCheckin(input: {
  readonly runId: string;
  readonly locationId: string;
  readonly sequenceIndex: number;
  readonly id?: string;
}): Checkin {
  const sequenceIndexLabel = String(input.sequenceIndex);

  return new Checkin({
    id: toCheckinId(input.id ?? `checkin-${sequenceIndexLabel}`),
    runId: toRunId(input.runId),
    locationId: toLocationId(input.locationId),
    sequenceIndex: input.sequenceIndex,
    method: CheckinMethod.Gps,
    validatedAt: new Date(BASE_DATE.getTime() + input.sequenceIndex * 60 * 1000),
    gpsLatitude: 47.669,
    gpsLongitude: 19.074,
    distanceMeters: 3,
    scannedQrToken: null,
    answerText: "a",
    isAnswerCorrect: true
  });
}
