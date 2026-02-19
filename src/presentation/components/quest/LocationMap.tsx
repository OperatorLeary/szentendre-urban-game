import { useEffect, useRef, type JSX } from "react";
import L from "leaflet";

import type { Location } from "@/core/entities/location.entity";

interface LocationMapProps {
  readonly locations: readonly Location[];
  readonly activeLocationId: string;
  readonly userPosition: { readonly latitude: number; readonly longitude: number } | null;
}

export function LocationMap({
  locations,
  activeLocationId,
  userPosition
}: LocationMapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) | void => {
    const mapContainer = mapContainerRef.current;
    if (mapContainer === null || locations.length === 0) {
      return;
    }

    const map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    const locationCoordinates: L.LatLngTuple[] = locations.map(
      (location: Location): L.LatLngTuple => [
        location.position.latitude,
        location.position.longitude
      ]
    );

    locations.forEach((location: Location): void => {
      const isActiveLocation: boolean = location.id === activeLocationId;

      L.circleMarker([location.position.latitude, location.position.longitude], {
        radius: isActiveLocation ? 8 : 6,
        color: isActiveLocation ? "#0a84ff" : "#687688",
        fillColor: isActiveLocation ? "#0a84ff" : "#93a4b8",
        fillOpacity: 0.9,
        weight: 2
      })
        .bindTooltip(`${location.sequenceNumber}. ${location.name}`, {
          direction: "top"
        })
        .addTo(map);

      if (isActiveLocation) {
        L.circle([location.position.latitude, location.position.longitude], {
          radius: location.validationRadiusMeters,
          color: "#0a84ff",
          fillColor: "#89c2ff",
          fillOpacity: 0.2,
          weight: 1
        }).addTo(map);
      }
    });

    if (userPosition !== null) {
      L.circleMarker([userPosition.latitude, userPosition.longitude], {
        radius: 7,
        color: "#17a34a",
        fillColor: "#17a34a",
        fillOpacity: 0.85,
        weight: 2
      })
        .bindTooltip("You", {
          direction: "top"
        })
        .addTo(map);

      locationCoordinates.push([userPosition.latitude, userPosition.longitude]);
    }

    const bounds = L.latLngBounds(locationCoordinates);
    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 16
    });

    return (): void => {
      map.remove();
    };
  }, [activeLocationId, locations, userPosition]);

  return <div ref={mapContainerRef} className="quest-map" aria-label="Quest map" />;
}
