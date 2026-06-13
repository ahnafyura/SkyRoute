"use client";

import { useMemo, useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Circle,
  Tooltip,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";

import type {
  AirportNode,
  GraphEdge,
  NfzZone,
  RouteResponse,
  NfzGeometryPolygon,
  NfzGeometryCircle,
  AlgorithmStep,
} from "@/types";
import { greatCirclePoints } from "@/lib/greatCircle";
import AlgorithmAnimation from "./AlgorithmAnimation";
import AirplaneMarker from "./AirplaneMarker";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MapViewProps {
  airports: AirportNode[];
  graphEdges?: GraphEdge[];
  nfzZones: NfzZone[];
  activeRoute: RouteResponse | null;
  selectedOrigin: string | null;
  selectedDest: string | null;
  onSelectAirport: (iata: string) => void;
  animationSteps?: AlgorithmStep[];
  isAnimating?: boolean;
  kShortestPaths?: Array<{ path: string[]; cost: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Airport marker icon factory
// ─────────────────────────────────────────────────────────────────────────────

function createAirportIcon(
  iata: string,
  state: "default" | "selected" | "inpath",
  degree: number,
  isDark: boolean
): L.DivIcon {
  const dotSize = degree >= 8 ? 11 : degree >= 4 ? 9 : 7;

  const palette = {
    default:  {
      dot:    isDark ? "#52525b" : "#a1a1aa",
      border: isDark ? "#3f3f46" : "#d4d4d8",
      label:  isDark ? "#71717a" : "#9ca3af",
      glow:   "none",
    },
    selected: {
      dot:    "#06b6d4",
      border: "#0e7490",
      label:  isDark ? "#06b6d4" : "#0891b2",
      glow:   "0 0 8px rgba(6,182,212,0.8)",
    },
    inpath: {
      dot:    isDark ? "#EBA5FA" : "#9b23c8",
      border: isDark ? "#c084fc" : "#7e22ce",
      label:  isDark ? "#EBA5FA" : "#9b23c8",
      glow:   isDark ? "0 0 6px rgba(235,165,250,0.8)" : "0 0 6px rgba(155,35,200,0.5)",
    },
  };

  const c = palette[state];
  const bold = state !== "default" ? "font-weight:700;" : "";
  const labelSize = dotSize <= 7 ? 8 : 9;

  return L.divIcon({
    className: "airport-custom-icon",
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;gap:2px;">
      <div style="
        width:${dotSize}px;height:${dotSize}px;
        border-radius:50%;
        background:${c.dot};
        border:1.5px solid ${c.border};
        box-shadow:${c.glow};
      "></div>
      <span style="
        font-family:monospace;
        font-size:${labelSize}px;
        color:${c.label};
        white-space:nowrap;
        letter-spacing:0.06em;
        ${bold}
        line-height:1;
      ">${iata}</span>
    </div>`,
    iconSize: [dotSize + 24, dotSize + 16],
    iconAnchor: [(dotSize + 24) / 2, dotSize / 2],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Distance label icon factory
// ─────────────────────────────────────────────────────────────────────────────

function createDistanceLabel(weight: number, isDark: boolean): L.DivIcon {
  return L.divIcon({
    className: "distance-label-icon",
    html: `<span class="distance-chip" style="
      background:${isDark ? "rgba(26,24,32,0.85)" : "rgba(255,255,255,0.92)"};
      border:1px solid ${isDark ? "rgba(45,42,53,0.8)" : "rgba(226,223,240,0.9)"};
      color:${isDark ? "#71717a" : "#6b7280"};
      font-family:monospace;font-size:8px;
      padding:2px 5px;border-radius:3px;
      white-space:nowrap;pointer-events:none;
      display:inline-block;
    ">${Math.round(weight)} km</span>`,
    iconSize: [60, 16],
    iconAnchor: [30, 8],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const MAP_CENTER: [number, number] = [-2.5, 118.0];
const MAP_ZOOM = 5;

export default function MapView({
  airports,
  graphEdges,
  nfzZones,
  activeRoute,
  selectedOrigin,
  selectedDest,
  onSelectAirport,
  animationSteps = [],
  isAnimating = false,
  kShortestPaths = [],
}: MapViewProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme !== "light";

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  // Node degree map for hub sizing
  const degreeMap = useMemo(() => {
    const m = new Map<string, number>();
    (graphEdges ?? []).forEach((e) => {
      m.set(e.from, (m.get(e.from) ?? 0) + 1);
      m.set(e.to, (m.get(e.to) ?? 0) + 1);
    });
    return m;
  }, [graphEdges]);

  // Route segments as great circle arcs
  const routeSegments = useMemo(() => {
    if (!activeRoute?.path || activeRoute.path.length < 2) return [];
    const airportMap = new Map(airports.map((a) => [a.iata, a]));
    const segs: {
      arcs: [number, number][];
      weight: number;
      midpoint: [number, number];
    }[] = [];

    for (let i = 0; i < activeRoute.path.length - 1; i++) {
      const from = airportMap.get(activeRoute.path[i]);
      const to = airportMap.get(activeRoute.path[i + 1]);
      if (!from || !to) continue;
      const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon);
      const mid = pts[Math.floor(pts.length / 2)];
      const edgeUsed = activeRoute.edges_used.find(
        (e) =>
          (e.from === activeRoute.path[i] && e.to === activeRoute.path[i + 1]) ||
          (e.from === activeRoute.path[i + 1] && e.to === activeRoute.path[i])
      );
      segs.push({ arcs: pts, weight: edgeUsed?.weight ?? 0, midpoint: mid });
    }
    return segs;
  }, [activeRoute, airports]);

  // K-shortest alternate paths (paths[1] and [2])
  const altSegments = useMemo(() => {
    if (!kShortestPaths || kShortestPaths.length <= 1) return [];
    const airportMap = new Map(airports.map((a) => [a.iata, a]));
    return kShortestPaths.slice(1).map((kp) => {
      const arcs: [number, number][][] = [];
      for (let i = 0; i < kp.path.length - 1; i++) {
        const from = airportMap.get(kp.path[i]);
        const to = airportMap.get(kp.path[i + 1]);
        if (from && to)
          arcs.push(greatCirclePoints(from.lat, from.lon, to.lat, to.lon));
      }
      return arcs;
    });
  }, [kShortestPaths, airports]);

  // Airport DivIcon instances (memoized to avoid constant re-creation)
  const airportIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    airports.forEach((airport) => {
      const isSelected =
        airport.iata === selectedOrigin || airport.iata === selectedDest;
      const isInPath = activeRoute?.path.includes(airport.iata) ?? false;
      const state = isSelected ? "selected" : isInPath ? "inpath" : "default";
      const degree = degreeMap.get(airport.iata) ?? 0;
      m.set(airport.iata, createAirportIcon(airport.iata, state, degree, isDark));
    });
    return m;
  }, [airports, selectedOrigin, selectedDest, activeRoute, isDark, degreeMap]);

  const routeColor = activeRoute?.recalculated ? "#F97316" : (isDark ? "#EBA5FA" : "#9b23c8");
  const routeClass = activeRoute?.recalculated ? "route-arc-recalc" : "route-arc";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: isDark ? "#0a090c" : "#f0eef5",
      }}
    >
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ width: "100%", height: "100%", zIndex: 10 }}
        zoomControl={false}
      >
        <TileLayer
          key={mounted ? resolvedTheme : "dark"}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />

        {/* ── NFZ Zones ── */}
        {nfzZones
          .filter((z) => z.active)
          .map((zone) => {
            if (zone.type === "polygon") {
              const geom = zone.geometry as NfzGeometryPolygon;
              const positions: [number, number][] = geom.coordinates[0].map(
                (c: [number, number]) => [c[1], c[0]]
              );
              return (
                <Polygon
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: "#EF4444",
                    fillColor: "#EF4444",
                    fillOpacity: 0.2,
                    weight: 1.5,
                    dashArray: "6 4",
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Polygon>
              );
            } else {
              const geom = zone.geometry as NfzGeometryCircle;
              return (
                <Circle
                  key={zone.id}
                  center={[geom.coordinates[1], geom.coordinates[0]]}
                  radius={geom.radius_km * 1000}
                  pathOptions={{
                    color: "#EF4444",
                    fillColor: "#EF4444",
                    fillOpacity: 0.2,
                    weight: 1.5,
                    dashArray: "6 4",
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Circle>
              );
            }
          })}

        {/* ── K-Shortest Alternate Arcs (behind main route) ── */}
        {altSegments.map((segs, pi) =>
          segs.map((pts, si) => (
            <Polyline
              key={`alt-${pi}-${si}`}
              positions={pts}
              pathOptions={{
                color: pi === 0 ? "#06b6d4" : "#F97316",
                weight: 1.5,
                opacity: 0.25,
                className: pi === 0 ? "route-alt-1" : "route-alt-2",
              }}
            />
          ))
        )}

        {/* ── Main Route — Great Circle Arcs ── */}
        {!isAnimating &&
          routeSegments.map((seg, i) => (
            <Polyline
              key={`route-${i}`}
              positions={seg.arcs}
              pathOptions={{
                color: routeColor,
                weight: 3,
                opacity: 0.92,
                className: routeClass,
              }}
            />
          ))}

        {/* ── Distance Labels at Arc Midpoints ── */}
        {!isAnimating &&
          routeSegments.map((seg, i) =>
            seg.weight > 0 ? (
              <Marker
                key={`dist-${i}`}
                position={seg.midpoint}
                icon={createDistanceLabel(seg.weight, isDark)}
                interactive={false}
              />
            ) : null
          )}

        {/* ── Airport Markers ── */}
        {airports.map((airport) => {
          const icon = airportIcons.get(airport.iata);
          if (!icon) return null;
          return (
            <Marker
              key={airport.iata}
              position={[airport.lat, airport.lon]}
              icon={icon}
              eventHandlers={{ click: () => onSelectAirport(airport.iata) }}
            >
              <Tooltip>
                {airport.name} ({airport.iata})
              </Tooltip>
            </Marker>
          );
        })}

        {/* ── Algorithm Animation Overlay ── */}
        <AlgorithmAnimation
          steps={animationSteps}
          isAnimating={isAnimating}
          airports={airports}
        />

        {/* ── Animated Airplane ── */}
        {activeRoute && (
          <AirplaneMarker
            activeRoute={activeRoute as import("@/types").AlgorithmResult}
            airports={airports}
            startDelayMs={isAnimating ? animationSteps.length * 75 + 900 : 300}
          />
        )}
      </MapContainer>
    </div>
  );
}
