"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Circle,
  Tooltip,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { AirportNode, NfzZone, RouteResponse, NfzGeometryPolygon, NfzGeometryCircle } from "@/types";

interface MapViewProps {
  airports: AirportNode[];
  nfzZones: NfzZone[];
  activeRoute: RouteResponse | null;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectAirport: (iata: string) => void;
}

// Center of Indonesia approx
const MAP_CENTER: [number, number] = [-2.5, 118.0];
const MAP_ZOOM = 5;

export default function MapView({
  airports,
  nfzZones,
  activeRoute,
  selectedOrigin,
  selectedDest,
  onSelectAirport,
}: MapViewProps) {
  // Extract path coordinates if activeRoute is present
  const routeCoords: [number, number][] = [];
  if (activeRoute && activeRoute.path) {
    activeRoute.path.forEach((iata) => {
      const airport = airports.find((a) => a.iata === iata);
      if (airport) {
        routeCoords.push([airport.lat, airport.lon]);
      }
    });
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#0a090c" }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ width: "100%", height: "100%", zIndex: 10 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* ── Render NFZ Zones ── */}
        {nfzZones
          .filter((zone) => zone.active)
          .map((zone) => {
            if (zone.type === "polygon") {
              const geometry = zone.geometry as NfzGeometryPolygon;
              // Standard GeoJSON uses [lon, lat], Leaflet uses [lat, lon]
              const positions: [number, number][] = geometry.coordinates[0].map(
                (coord: [number, number]) => [coord[1], coord[0]]
              );
              return (
                <Polygon
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: "#EF4444", // Red
                    fillColor: "#EF4444",
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: "5 5",
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Polygon>
              );
            } else if (zone.type === "circle") {
              const geometry = zone.geometry as NfzGeometryCircle;
              const center: [number, number] = [
                geometry.coordinates[1],
                geometry.coordinates[0],
              ];
              return (
                <Circle
                  key={zone.id}
                  center={center}
                  radius={geometry.radius_km * 1000} // Convert km to meters
                  pathOptions={{
                    color: "#EF4444",
                    fillColor: "#EF4444",
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: "5 5",
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Circle>
              );
            }
            return null;
          })}

        {/* ── Render Active Route Path ── */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: activeRoute?.recalculated ? "#F97316" : "#EBA5FA", // Orange if recalculated, else Neon Pink
              weight: 4,
              opacity: 0.85,
              className: activeRoute?.recalculated ? "animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "drop-shadow-[0_0_6px_rgba(235,165,250,0.8)]",
            }}
          />
        )}

        {/* ── Render Airports ── */}
        {airports.map((airport) => {
          const isSelected =
            airport.iata === selectedOrigin || airport.iata === selectedDest;
          const isInPath = activeRoute?.path.includes(airport.iata);

          let color = "#6B7280"; // Default Gray
          let fillColor = "#374151";
          let radius = 5;

          if (isSelected) {
            color = "#06b6d4"; // Neon Cyan
            fillColor = "#06b6d4";
            radius = 8;
          } else if (isInPath) {
            color = "#EBA5FA"; // Neon Pink
            fillColor = "#EBA5FA";
            radius = 6;
          }

          return (
            <CircleMarker
              key={airport.iata}
              center={[airport.lat, airport.lon]}
              radius={radius}
              eventHandlers={{
                click: () => onSelectAirport(airport.iata),
              }}
              pathOptions={{
                color: color,
                fillColor: fillColor,
                fillOpacity: 0.9,
                weight: isSelected ? 3 : 2,
                className: isSelected ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "",
              }}
            >
              <Tooltip>
                {airport.name} ({airport.iata})
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
