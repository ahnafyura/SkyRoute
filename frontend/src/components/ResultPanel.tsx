"use client";

import type { RouteResponse } from "@/types";

interface ResultPanelProps {
  currentPath: RouteResponse | null;
  isLoading: boolean;
  isRecalculating: boolean;
  logs: string[];
}

export default function ResultPanel({
  currentPath,
  isLoading,
  isRecalculating,
  logs,
}: ResultPanelProps) {
  return (
    <div className="font-mono text-[10px] text-zinc-500 leading-relaxed flex flex-col gap-2">
      {/* ── Render logs ── */}
      {logs.length === 0 && !currentPath && !isLoading && (
        <div className="text-zinc-600">AWAITING_INPUT...</div>
      )}

      {logs.map((log, i) => {
        // Highlight ERROR in red
        const isError = log.includes("ERROR:");
        return (
          <div key={i} className={isError ? "text-red-400 font-bold" : "text-zinc-400"}>
            {log}
          </div>
        );
      })}

      {/* ── Loading indicators ── */}
      {isLoading && (
        <div className="text-[#EBA5FA] animate-pulse">
          [SYSTEM] Calculating vector...
        </div>
      )}

      {isRecalculating && (
        <div className="text-[#EBA5FA] animate-pulse">
          [SYSTEM] Menghitung ulang rute…
        </div>
      )}

      {/* ── Render currentPath details only if it exists ── */}
      {currentPath && (
        <>
          {currentPath.recalculated && !isRecalculating && (
            <div className="text-red-400 font-bold border border-red-500/30 bg-red-950/20 px-2 py-1 self-start mt-2">
              [WARN] ⚠ RUTE DIKALKULASI ULANG
            </div>
          )}

          {/* ── Path display ── */}
          <div className="text-zinc-300 mt-2">
            <span className="text-zinc-600">[ROUTE_PATH]</span> {currentPath.path.join(" → ")}
          </div>

          {/* ── Distance info ── */}
          <div className="flex gap-6">
            <div>
              <span className="text-zinc-600">[DIST]</span> {currentPath.total_distance.toFixed(2)} km
            </div>
            <div>
              <span className="text-zinc-600">[EDGES]</span> {currentPath.edges_used.length}
            </div>
          </div>

          {/* ── Edges detail ── */}
          <div>
            <div className="text-zinc-600">[EDGE_TRACE]</div>
            <ul className="pl-4 border-l border-zinc-800 space-y-1 mt-1 font-mono">
              {currentPath.edges_used.map((edge, i) => (
                <li key={i}>
                  <span className="text-cyan-500">{edge.from}</span>{" "}
                  <span className="text-zinc-600">to</span>{" "}
                  <span className="text-cyan-500">{edge.to}</span>{" "}
                  <span className="text-zinc-500">({edge.weight.toFixed(2)} km)</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Blocked edges ── */}
          {currentPath.blocked_edges.length > 0 && (
            <details className="mt-2 group">
              <summary className="cursor-pointer text-red-400 hover:text-red-300 transition-colors">
                [BLOCKED_EDGES] ({currentPath.blocked_edges.length}) — Click to expand
              </summary>
              <ul className="pl-4 border-l border-red-900/50 space-y-1 mt-1 text-red-500/80">
                {currentPath.blocked_edges.map((be, i) => (
                  <li key={i}>
                    {be.from} → {be.to} // REASON: {be.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
