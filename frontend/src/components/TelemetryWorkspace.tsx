"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { AirportNode, GraphEdge, NfzZone } from "@/types";
import type { AlgorithmResult } from "@/lib/algorithms";

interface TelemetryWorkspaceProps {
  currentPath: AlgorithmResult | null;
  airports: AirportNode[];
  graphEdges: GraphEdge[];
  nfzZones: NfzZone[];
}

export default function TelemetryWorkspace({
  currentPath,
  airports,
  graphEdges,
  nfzZones,
}: TelemetryWorkspaceProps) {
  const [eqBars, setEqBars] = useState([3, 5, 4, 7, 9, 10, 12, 8, 6, 4, 3, 2, 1]);
  const [planDownloaded, setPlanDownloaded] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setEqBars((prev) =>
        prev.map((v) => Math.max(1, Math.min(12, v + Math.floor(Math.random() * 5) - 2)))
      );
    }, 350);
    return () => clearInterval(id);
  }, []);

  const handleFileFlightPlan = useCallback(() => {
    if (!currentPath) return;
    const origin = currentPath.path[0];
    const dest = currentPath.path[currentPath.path.length - 1];
    const lines = [
      "═══════════════════════════════════════════════════",
      "             AEROOPTIX FLIGHT PLAN                 ",
      "═══════════════════════════════════════════════════",
      `GENERATED  : ${new Date().toISOString()}`,
      `ALGORITHM  : ${currentPath.algo?.toUpperCase() ?? "—"}`,
      `RECALC NFZ : ${currentPath.recalculated ? "YES" : "NO"}`,
      "",
      "ROUTE SUMMARY",
      "───────────────────────────────────────────────────",
      `ORIGIN      : ${origin}`,
      `DESTINATION : ${dest}`,
      `FULL PATH   : ${currentPath.path.join(" → ")}`,
      `DISTANCE    : ${currentPath.total_distance.toFixed(2)} km`,
      `DISTANCE    : ${(currentPath.total_distance * 0.539957).toFixed(0)} NM`,
      `WAYPOINTS   : ${currentPath.path.length}`,
      "",
      "EDGE TRACE",
      "───────────────────────────────────────────────────",
      ...currentPath.edges_used.map(
        (e, i) =>
          `  ${String(i + 1).padStart(2, "0")}.  ${e.from.padEnd(4)} → ${e.to.padEnd(4)}  ${e.weight.toFixed(0).padStart(5)} km`
      ),
      "",
      "ALGORITHM PERFORMANCE",
      "───────────────────────────────────────────────────",
      `NODES EXPLORED : ${currentPath.nodesExplored}`,
      `CALC TIME      : ${currentPath.timeMs}ms`,
      `BLOCKED EDGES  : ${currentPath.blocked_edges.length}`,
      "",
      ...(currentPath.blocked_edges.length > 0
        ? [
            "BLOCKED EDGES (NFZ ACTIVE)",
            "───────────────────────────────────────────────────",
            ...currentPath.blocked_edges.map(
              (be) => `  ${be.from} → ${be.to}  // ${be.reason}`
            ),
            "",
          ]
        : []),
      "═══════════════════════════════════════════════════",
      "              END OF FLIGHT PLAN                   ",
      "═══════════════════════════════════════════════════",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight_plan_${origin}_${dest}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setPlanDownloaded(true);
    setTimeout(() => setPlanDownloaded(false), 3000);
  }, [currentPath]);

  const origin = currentPath?.path[0];
  const dest = currentPath?.path[currentPath.path.length - 1];
  const distNm = currentPath
    ? (currentPath.total_distance * 0.539957).toFixed(0)
    : "—";

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Center Area ── */}
      <section className="flex flex-col flex-1 p-4 gap-4 bg-sky-bg">
        {/* Main panel */}
        <div className="flex-1 border border-sky-border bg-sky-panel rounded-lg relative flex flex-col justify-between overflow-hidden">
          <div className="p-6 flex justify-between items-start">
            <div>
              <div className="inline-block px-2 py-1 border border-sky-border text-sky-muted text-[10px] tracking-widest mb-2 bg-sky-surface/60">
                LIVESTREAM_VECTOR_01
              </div>
              <h2 className="text-3xl font-bold tracking-widest text-sky-text">
                TRAJECTORY_WIREFRAME
              </h2>
              {currentPath && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-sky-accent font-mono tracking-widest"
                >
                  {origin} → {dest}
                </motion.div>
              )}
            </div>
            <div className="text-right text-[10px] text-sky-cyan font-mono tracking-widest leading-relaxed">
              {currentPath ? (
                <>
                  <div>DIST: {currentPath.total_distance.toFixed(2)} KM</div>
                  <div>ALGO: {currentPath.algo?.toUpperCase()}</div>
                  <div>TIME: {currentPath.timeMs}ms</div>
                </>
              ) : (
                <>
                  <div>AWAITING</div>
                  <div>ROUTE_DATA</div>
                </>
              )}
            </div>
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 top-24 bottom-32 flex flex-col items-center justify-evenly pointer-events-none opacity-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full border-t border-dashed border-sky-cyan/60" />
            ))}
          </div>

          {/* Route path visualization */}
          {currentPath ? (
            <div className="absolute inset-0 top-28 bottom-32 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-2 flex-wrap justify-center px-12">
                {currentPath.path.map((iata, i) => (
                  <div key={iata} className="flex items-center gap-2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, type: "spring" }}
                      className="px-3 py-1.5 border border-sky-border bg-sky-surface text-sky-accent text-xs font-bold tracking-wider rounded shadow"
                    >
                      {iata}
                    </motion.div>
                    {i < currentPath.path.length - 1 && (
                      <span className="text-sky-muted text-sm">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sky-muted text-[11px] tracking-widest opacity-40">
              NO_ACTIVE_ROUTE — COMPUTE VECTOR FIRST
            </div>
          )}

          {/* Bottom telemetry strip */}
          <div className="p-6 flex justify-between items-end border-t border-sky-border bg-gradient-to-t from-sky-panel/90 to-transparent z-10">
            <div className="flex gap-8 font-mono">
              {[
                ["PITCH", "+2.4°"],
                ["ROLL", "-0.1°"],
                ["YAW", "356°"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] text-sky-muted mb-1 tracking-widest">{label}</div>
                  <div className="text-lg text-sky-text">{val}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-sky-accent animate-pulse" />
              <div className="text-[10px] text-sky-muted tracking-widest">SIGNAL_STRONG</div>
              <div className="w-24 h-1.5 bg-sky-border rounded overflow-hidden">
                <div className="w-4/5 h-full bg-sky-accent rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Equalizer strip */}
        <div className="h-24 border border-sky-border bg-sky-panel rounded-lg p-4 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-sky-cyan tracking-widest mb-1">FL_OPTIMAL</div>
            <div className="text-xl text-sky-muted font-mono">FL390</div>
          </div>
          <div className="flex items-end gap-1 h-full py-2">
            {eqBars.map((val, i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-sky-accent rounded-sm"
                animate={{ height: `${(val / 12) * 100}%`, opacity: 0.3 + (val / 12) * 0.7 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              />
            ))}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-sky-muted tracking-widest mb-1">V_SPEED</div>
            <div className="text-lg text-sky-text font-mono">+450 FT/MIN</div>
          </div>
        </div>
      </section>

      {/* ── Right Analytics Panel ── */}
      <aside className="w-[340px] border-l border-sky-border bg-sky-panel flex flex-col p-6 gap-6 overflow-y-auto">
        {/* Altitude card */}
        <div className="border border-sky-border bg-sky-surface rounded-lg p-4 relative">
          <div className="absolute top-4 right-4 text-[9px] text-sky-muted font-mono tracking-widest">
            ID: ALT_TX_094
          </div>
          <div className="text-[10px] text-sky-cyan tracking-widest mb-2">ALTITUDE_MSL</div>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black text-sky-cyan tracking-tight">FL380</span>
            <span className="text-xs text-sky-muted tracking-widest">CRUISE</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-sky-muted tracking-widest mb-1">TARGET</div>
              <div className="text-sm text-sky-text font-mono">FL410</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-sky-muted tracking-widest mb-1">DEVIATION</div>
              <div className="text-sm text-red-400 font-mono">-0.02%</div>
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex gap-4">
          <div className="flex-1 border border-sky-border bg-sky-surface rounded-lg p-4">
            <div className="text-[10px] text-sky-muted tracking-widest mb-2">DISTANCE</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl text-sky-text font-mono">{distNm}</span>
              <span className="text-[9px] text-sky-muted tracking-widest">NM</span>
            </div>
            <div className="mt-3 w-full h-1 bg-sky-border rounded overflow-hidden">
              <div className="w-2/3 h-full bg-sky-cyan rounded" />
            </div>
          </div>
          <div className="flex-1 border border-sky-border bg-sky-surface rounded-lg p-4">
            <div className="text-[10px] text-sky-muted tracking-widest mb-2">EXPLORED</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl text-sky-text font-mono">
                {currentPath?.nodesExplored ?? "—"}
              </span>
              <span className="text-[9px] text-sky-muted tracking-widest">NODES</span>
            </div>
            <div className="mt-3 w-full h-1 bg-sky-border rounded overflow-hidden">
              <div
                className="h-full bg-sky-accent rounded transition-all"
                style={{
                  width: currentPath
                    ? `${Math.min(100, (currentPath.nodesExplored / Math.max(airports.length, 1)) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Fleet sync status */}
        <div className="border border-sky-border bg-sky-surface rounded-lg p-6 flex flex-col items-center relative overflow-hidden">
          <div className="text-[10px] text-sky-muted tracking-widest mb-6 border-b border-sky-border w-full text-center pb-2">
            FLEET_SYNC_STATUS
          </div>
          <div className="w-32 h-32 rounded-xl border border-sky-border bg-sky-panel flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(235,165,250,0.1)] mb-6">
            <div className="text-3xl font-bold text-sky-accent mb-1">98%</div>
            <div className="text-[8px] text-sky-muted tracking-widest">UPLINKED</div>
          </div>
          <div className="w-full flex flex-col gap-3 text-xs font-mono">
            <div className="flex justify-between items-center border-l-2 border-sky-cyan pl-2">
              <span className="text-sky-muted">{origin ?? "ORIGIN_NODE"}</span>
              <span className="text-sky-cyan tracking-widest text-[10px]">STABLE</span>
            </div>
            <div className="flex justify-between items-center border-l-2 border-sky-accent pl-2">
              <span className="text-sky-muted">{dest ?? "DEST_NODE"}</span>
              <span className="text-sky-accent tracking-widest text-[10px]">
                {currentPath ? "ROUTE_ACTIVE" : "AWAITING"}
              </span>
            </div>
          </div>
        </div>

        {/* Network summary */}
        <div className="border border-sky-border bg-sky-surface rounded-lg p-4 flex flex-col gap-2 text-[11px] font-mono">
          <div className="text-[10px] text-sky-accent font-bold tracking-widest mb-1">NETWORK</div>
          {[
            ["AIRPORTS", airports.length],
            ["ROUTES", graphEdges.length],
            ["NFZ ACTIVE", nfzZones.filter((z) => z.active).length],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between">
              <span className="text-sky-muted">{k}</span>
              <span className="text-sky-cyan">{v}</span>
            </div>
          ))}
        </div>

        {/* FILE FLIGHT PLAN */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleFileFlightPlan}
          disabled={!currentPath}
          className="mt-auto w-full py-4 bg-sky-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold tracking-widest rounded transition-all text-sm shadow-[0_0_20px_rgba(235,165,250,0.3)]"
        >
          {planDownloaded
            ? "✓ PLAN_DOWNLOADED"
            : currentPath
            ? "FILE FLIGHT PLAN"
            : "NO_ROUTE_ACTIVE"}
        </motion.button>
      </aside>
    </div>
  );
}
