import { DomainError } from "@/core/errors/app-error";
import type { Brand } from "@/core/types/brand.type";

export type LocationId = Brand<string, "LocationId">;
export type RouteId = Brand<string, "RouteId">;
export type RunId = Brand<string, "RunId">;
export type CheckinId = Brand<string, "CheckinId">;
export type BugReportId = Brand<string, "BugReportId">;

function toIdentifier<TIdentifier extends string>(
  value: string,
  fieldName: string
): Brand<string, TIdentifier> {
  const normalizedValue: string = value.trim();

  if (normalizedValue.length === 0) {
    throw new DomainError("Identifier cannot be empty.", {
      context: {
        fieldName
      }
    });
  }

  return normalizedValue as Brand<string, TIdentifier>;
}

export function toLocationId(value: string): LocationId {
  return toIdentifier<"LocationId">(value, "locationId");
}

export function toRouteId(value: string): RouteId {
  return toIdentifier<"RouteId">(value, "routeId");
}

export function toRunId(value: string): RunId {
  return toIdentifier<"RunId">(value, "runId");
}

export function toCheckinId(value: string): CheckinId {
  return toIdentifier<"CheckinId">(value, "checkinId");
}

export function toBugReportId(value: string): BugReportId {
  return toIdentifier<"BugReportId">(value, "bugReportId");
}
