"use client";

import { useEffect, useState, useMemo } from "react";
import { CircleMarker } from "react-leaflet";
import type { AirportNode, AlgorithmStep } from "@/types";

interface AlgorithmAnimationProps {
  steps: AlgorithmStep[];
  isAnimating: boolean;
  airports: AirportNode[];
}

export default function AlgorithmAnimation({
  steps,
  isAnimating,
  airports,
}: AlgorithmAnimationProps) {
  const [stepIdx, setStepIdx] = useState(-1);

  const airportMap = useMemo(
    () => new Map(airports.map((a) => [a.iata, a])),
    [airports]
  );

  useEffect(() => {
    if (!isAnimating || steps.length === 0) {
      setStepIdx(-1);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setStepIdx(i), i * 75));
    });
    // Clear after last step + brief hold
    timers.push(
      setTimeout(() => setStepIdx(-1), steps.length * 75 + 400)
    );

    return () => timers.forEach(clearTimeout);
  }, [isAnimating, steps]);

  if (stepIdx === -1 || steps.length === 0) return null;

  const current = steps[stepIdx];

  return (
    <>
      {/* Settled (explored) nodes — dim gray */}
      {current.settled.map((iata) => {
        const a = airportMap.get(iata);
        if (!a) return null;
        return (
          <CircleMarker
            key={`settled-${iata}`}
            center={[a.lat, a.lon]}
            radius={5}
            pathOptions={{
              color: "#4B5563",
              fillColor: "#374151",
              fillOpacity: 0.65,
              weight: 1,
            }}
          />
        );
      })}

      {/* Frontier nodes — pulsing accent */}
      {current.frontier.map((iata) => {
        if (current.settled.includes(iata)) return null;
        const a = airportMap.get(iata);
        if (!a) return null;
        return (
          <CircleMarker
            key={`frontier-${iata}`}
            center={[a.lat, a.lon]}
            radius={9}
            pathOptions={{
              color: "#EBA5FA",
              fillColor: "#EBA5FA",
              fillOpacity: 0.45,
              weight: 2,
              className: "frontier-node",
            }}
          />
        );
      })}

      {/* Current node — bright cyan glow */}
      {(() => {
        const a = airportMap.get(current.node);
        if (!a) return null;
        return (
          <CircleMarker
            key={`current-${current.node}`}
            center={[a.lat, a.lon]}
            radius={13}
            pathOptions={{
              color: "#06b6d4",
              fillColor: "#06b6d4",
              fillOpacity: 0.75,
              weight: 3,
            }}
          />
        );
      })()}
    </>
  );
}
