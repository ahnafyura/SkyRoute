"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { AirportNode, AlgorithmResult } from "@/types";
import { greatCirclePoints, bearing } from "@/lib/greatCircle";
import { haversine } from "@/lib/algorithms";

interface AirplaneMarkerProps {
  activeRoute: AlgorithmResult | null;
  airports: AirportNode[];
  /** Delay in ms before the airplane starts flying (waits for algorithm animation) */
  startDelayMs?: number;
}

function createAirplaneIcon(rotation: number): L.DivIcon {
  return L.divIcon({
    className: "airplane-icon",
    html: `<div style="transform:rotate(${rotation}deg);transform-origin:center;display:flex;align-items:center;justify-content:center;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#EBA5FA" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function computeCumDist(pts: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    cum.push(cum[i - 1] + d);
  }
  return cum;
}

function interpolateTrack(
  pts: [number, number][],
  cum: number[],
  totalDist: number,
  t: number
): { lat: number; lon: number; hdg: number } {
  const target = t * totalDist;
  let lo = 0, hi = pts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  const segLen = cum[lo + 1] - cum[lo];
  const frac = segLen > 0 ? (target - cum[lo]) / segLen : 0;
  const [lat1, lon1] = pts[lo];
  const [lat2, lon2] = pts[lo + 1] ?? pts[lo];
  return {
    lat: lat1 + frac * (lat2 - lat1),
    lon: lon1 + frac * (lon2 - lon1),
    hdg: bearing(lat1, lon1, lat2, lon2),
  };
}

// Ease in-out cubic
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function AirplaneMarker({
  activeRoute,
  airports,
  startDelayMs = 600,
}: AirplaneMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const rafRef = useRef<number>(0);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup previous animation
    cancelAnimationFrame(rafRef.current);
    if (delayRef.current) clearTimeout(delayRef.current);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (!activeRoute || activeRoute.path.length < 2) return;

    // Build flat track from great-circle arcs
    const airportMap = new Map(airports.map((a) => [a.iata, a]));
    const trackPoints: [number, number][] = [];

    for (let i = 0; i < activeRoute.path.length - 1; i++) {
      const from = airportMap.get(activeRoute.path[i]);
      const to = airportMap.get(activeRoute.path[i + 1]);
      if (!from || !to) continue;
      const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon);
      if (i === 0) trackPoints.push(...pts);
      else trackPoints.push(...pts.slice(1)); // avoid duplicate midpoints
    }

    if (trackPoints.length < 2) return;

    const cum = computeCumDist(trackPoints);
    const totalDist = cum[cum.length - 1];
    const FLIGHT_DURATION = 7000; // ms

    delayRef.current = setTimeout(() => {
      // Create marker at start position
      const icon = createAirplaneIcon(
        bearing(
          trackPoints[0][0], trackPoints[0][1],
          trackPoints[1][0], trackPoints[1][1]
        )
      );
      const marker = L.marker(trackPoints[0], { icon, zIndexOffset: 1000 });
      marker.addTo(map);
      markerRef.current = marker;

      let startTime: number | null = null;

      function animate(ts: number) {
        if (!startTime) startTime = ts;
        const raw = Math.min((ts - startTime) / FLIGHT_DURATION, 1);
        const t = easeInOut(raw);
        const { lat, lon, hdg } = interpolateTrack(trackPoints, cum, totalDist, t);

        marker.setLatLng([lat, lon]);
        marker.setIcon(createAirplaneIcon(hdg));

        if (raw < 1) rafRef.current = requestAnimationFrame(animate);
      }

      rafRef.current = requestAnimationFrame(animate);
    }, startDelayMs);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (delayRef.current) clearTimeout(delayRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [activeRoute, airports, map, startDelayMs]);

  return null;
}
