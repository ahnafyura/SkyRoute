"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AirportNode, GraphEdge, NfzZone } from "@/types";
import type { AlgorithmResult } from "@/lib/algorithms";

interface SysStatusWorkspaceProps {
  airports: AirportNode[];
  graphEdges: GraphEdge[];
  nfzZones: NfzZone[];
  currentPath: AlgorithmResult | null;
}

export default function SysStatusWorkspace({
  airports,
  graphEdges,
  nfzZones,
  currentPath,
}: SysStatusWorkspaceProps) {
  const stats = useMemo(() => {
    const degreeMap = new Map<string, number>();
    graphEdges.forEach((e) => {
      degreeMap.set(e.from, (degreeMap.get(e.from) ?? 0) + 1);
      degreeMap.set(e.to, (degreeMap.get(e.to) ?? 0) + 1);
    });
    const degrees = Array.from(degreeMap.values());
    const avgDegree =
      degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
    const maxDegree = Math.max(...degrees, 1);

    const hubs = Array.from(degreeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([iata, deg]) => ({ iata, deg }));

    const weights = graphEdges.map((e) => e.weight);
    const avgDist =
      weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const maxDist = Math.max(...weights, 0);

    return { nodeCount: airports.length, edgeCount: graphEdges.length, nfzCount: nfzZones.length, activeNfz: nfzZones.filter((z) => z.active).length, avgDegree: avgDegree.toFixed(1), maxDegree, avgDist: avgDist.toFixed(0), maxDist: maxDist.toFixed(0), hubs };
  }, [airports, graphEdges, nfzZones]);

  const cards = [
    { label: "AIRPORTS", value: stats.nodeCount, color: "text-sky-accent", sub: "nodes in graph" },
    { label: "ROUTES", value: stats.edgeCount, color: "text-sky-cyan", sub: "bidirectional edges" },
    { label: "NFZ ZONES", value: stats.nfzCount, color: "text-red-400", sub: `${stats.activeNfz} active` },
    { label: "AVG DEGREE", value: stats.avgDegree, color: "text-sky-text", sub: "connections / node" },
    { label: "AVG SEGMENT", value: `${stats.avgDist} km`, color: "text-sky-cyan", sub: "mean edge weight" },
    { label: "LONGEST EDGE", value: `${stats.maxDist} km`, color: "text-sky-accent", sub: "max single segment" },
  ];

  return (
    <div className="flex flex-1 overflow-y-auto bg-sky-bg">
      <div className="flex-1 p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div>
          <div className="text-[10px] text-sky-muted tracking-widest mb-1">SECTOR_7G</div>
          <h2 className="text-2xl font-bold tracking-widest text-sky-text">SYS_STATUS</h2>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="border border-sky-border bg-sky-panel rounded-lg p-4"
            >
              <div className="text-[10px] text-sky-muted tracking-widest mb-2">{c.label}</div>
              <div className={`text-3xl font-black tracking-tight ${c.color}`}>{c.value}</div>
              <div className="text-[10px] text-sky-muted mt-1 tracking-widest">{c.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Hub ranking */}
        <div className="border border-sky-border bg-sky-panel rounded-lg p-5">
          <div className="text-[10px] text-sky-accent tracking-widest font-bold mb-4 border-b border-sky-border pb-2">
            HUB RANKING — MOST CONNECTED AIRPORTS
          </div>
          <div className="flex flex-col gap-2.5">
            {stats.hubs.map((hub, i) => (
              <div key={hub.iata} className="flex items-center gap-3">
                <span className="text-[10px] text-sky-muted w-5 text-right font-mono">{i + 1}.</span>
                <span className="text-sky-text font-bold w-12 text-[11px] tracking-wider">{hub.iata}</span>
                <div className="flex-1 h-1.5 bg-sky-border rounded overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(hub.deg / stats.maxDegree) * 100}%` }}
                    transition={{ delay: i * 0.08 + 0.3, duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded"
                    style={{
                      background: i < 3 ? "var(--sky-accent)" : "var(--sky-cyan)",
                    }}
                  />
                </div>
                <span className="text-[10px] text-sky-muted w-16 text-right font-mono">{hub.deg} routes</span>
              </div>
            ))}
          </div>
        </div>

        {/* NFZ matrix */}
        <div className="border border-sky-border bg-sky-panel rounded-lg p-5">
          <div className="text-[10px] text-sky-accent tracking-widest font-bold mb-4 border-b border-sky-border pb-2">
            NFZ CONSTRAINT MATRIX
          </div>
          {nfzZones.length === 0 ? (
            <div className="text-sky-muted text-[11px] text-center py-4">NO_ZONES_DETECTED</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nfzZones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between border border-sky-border bg-sky-surface rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        zone.active ? "bg-red-500 animate-pulse" : "bg-sky-border"
                      }`}
                    />
                    <div>
                      <div className="text-[11px] text-sky-text font-bold tracking-wider">
                        {zone.name.toUpperCase()}
                      </div>
                      <div className="text-[9px] text-sky-muted tracking-widest">
                        {zone.type.toUpperCase()}{" // "}{zone.id}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-widest shrink-0 ${
                      zone.active ? "text-red-400" : "text-sky-muted"
                    }`}
                  >
                    {zone.active ? "ACTIVE" : "OFFLINE"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last computed route */}
        {currentPath ? (
          <div className="border border-sky-border bg-sky-panel rounded-lg p-5">
            <div className="text-[10px] text-sky-accent tracking-widest font-bold mb-4 border-b border-sky-border pb-2">
              LAST_COMPUTED_ROUTE
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-mono">
              {[
                ["ALGORITHM", currentPath.algo?.toUpperCase() ?? "—", "text-sky-cyan"],
                ["DISTANCE", `${currentPath.total_distance.toFixed(0)} km`, "text-sky-cyan"],
                ["NODES EXPLORED", String(currentPath.nodesExplored), "text-sky-accent"],
                ["CALC TIME", `${currentPath.timeMs}ms`, "text-sky-accent"],
                ["WAYPOINTS", String(currentPath.path.length), "text-sky-text"],
                ["BLOCKED EDGES", String(currentPath.blocked_edges.length), currentPath.blocked_edges.length > 0 ? "text-red-400" : "text-sky-text"],
              ].map(([k, v, cls]) => (
                <div key={k} className="flex justify-between border-b border-sky-border/50 pb-1.5">
                  <span className="text-sky-muted">{k}</span>
                  <span className={cls}>{v}</span>
                </div>
              ))}
              <div className="col-span-2 flex justify-between pt-1">
                <span className="text-sky-muted">PATH</span>
                <span className="text-sky-text">{currentPath.path.join(" → ")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-sky-border bg-sky-panel rounded-lg p-5 text-center text-sky-muted text-[11px] tracking-widest">
            NO_ROUTE_COMPUTED — SELECT ORIGIN + DESTINATION AND RUN VECTOR CALC
          </div>
        )}
      </div>
    </div>
  );
}
