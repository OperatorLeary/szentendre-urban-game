import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { isValidSlug } from "@/shared/utils/validation-guard";

export interface RouteSelectionState {
  readonly routeSlug: string;
  readonly locationSlug: string;
  readonly isValid: boolean;
}

const EMPTY_ROUTE_STATE: RouteSelectionState = {
  routeSlug: "",
  locationSlug: "",
  isValid: false
};

export function useRoute(): RouteSelectionState {
  const params = useParams<{ routeSlug?: string; locationSlug?: string }>();

  return useMemo((): RouteSelectionState => {
    const routeSlug: string | undefined = params.routeSlug;
    const locationSlug: string | undefined = params.locationSlug;

    if (routeSlug === undefined || locationSlug === undefined) {
      return EMPTY_ROUTE_STATE;
    }

    const normalizedRouteSlug: string = routeSlug.trim().toLowerCase();
    const normalizedLocationSlug: string = locationSlug.trim().toLowerCase();

    return {
      routeSlug: normalizedRouteSlug,
      locationSlug: normalizedLocationSlug,
      isValid:
        isValidSlug(normalizedRouteSlug) && isValidSlug(normalizedLocationSlug)
    };
  }, [params.locationSlug, params.routeSlug]);
}
