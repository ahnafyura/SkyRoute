"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AlgorithmResult } from "@/lib/algorithms";

interface ResultPanelProps {
  currentPath: AlgorithmResult | null;
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
    <div className="font-mono text-[10px] text-sky-muted leading-relaxed flex flex-col gap-1.5">
      {logs.length === 0 && !currentPath && !isLoading && (
        <div className="text-sky-muted opacity-50">AWAITING_INPUT...</div>
      )}

      {logs.map((log, i) => {
        const isError = log.includes("ERROR:");
        return (
          <div key={i} className={isError ? "text-red-400 font-bold" : "text-sky-muted"}>
            {log}
          </div>
        );
      })}

      {isLoading && (
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-sky-accent"
        >
          [SYSTEM] Calculating optimal vector...
        </motion.div>
      )}

      {isRecalculating && (
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-sky-accent"
        >
          [SYSTEM] NFZ constraint detected — recalculating route...
        </motion.div>
      )}

      <AnimatePresence>
        {currentPath && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-1.5"
          >
            {currentPath.recalculated && !isRecalculating && (
              <div className="text-orange-400 font-bold border border-orange-500/30 bg-orange-950/20 px-2 py-1 self-start rounded">
                [WARN] ⚠ ROUTE RECALCULATED DUE TO NFZ
              </div>
            )}

            {/* Path display — staggered reveal */}
            <div className="text-sky-text mt-1">
              <span className="text-sky-muted">[ROUTE_PATH]</span>{" "}
              {currentPath.path.map((iata, i) => (
                <motion.span
                  key={`${iata}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.2 }}
                  className="text-sky-accent font-bold"
                >
                  {iata}
                  {i < currentPath.path.length - 1 && (
                    <span className="text-sky-muted font-normal mx-1">→</span>
                  )}
                </motion.span>
              ))}
            </div>

            {/* Distance + stats */}
            <div className="flex gap-4 flex-wrap">
              <span>
                <span className="text-sky-muted">[DIST]</span>{" "}
                <span className="text-sky-cyan">{currentPath.total_distance.toFixed(2)} km</span>
              </span>
              <span>
                <span className="text-sky-muted">[EDGES]</span>{" "}
                <span className="text-sky-cyan">{currentPath.edges_used.length}</span>
              </span>
              {currentPath.nodesExplored > 0 && (
                <span>
                  <span className="text-sky-muted">[EXPLORED]</span>{" "}
                  <span className="text-sky-cyan">{currentPath.nodesExplored} nodes</span>
                </span>
              )}
              {currentPath.timeMs > 0 && (
                <span>
                  <span className="text-sky-muted">[TIME]</span>{" "}
                  <span className="text-sky-cyan">{currentPath.timeMs}ms</span>
                </span>
              )}
              <span>
                <span className="text-sky-muted">[ALGO]</span>{" "}
                <span className="text-sky-accent">{currentPath.algo?.toUpperCase() ?? "—"}</span>
              </span>
            </div>

            {/* Edge trace */}
            <div>
              <div className="text-sky-muted">[EDGE_TRACE]</div>
              <ul className="pl-3 border-l border-sky-border space-y-0.5 mt-0.5">
                {currentPath.edges_used.map((edge, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 + 0.2 }}
                  >
                    <span className="text-sky-cyan">{edge.from}</span>{" "}
                    <span className="text-sky-muted">→</span>{" "}
                    <span className="text-sky-cyan">{edge.to}</span>{" "}
                    <span className="text-sky-muted opacity-70">({edge.weight.toFixed(0)} km)</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Blocked edges */}
            {currentPath.blocked_edges.length > 0 && (
              <details className="mt-1 group">
                <summary className="cursor-pointer text-red-400 hover:text-red-300 transition-colors">
                  [BLOCKED_EDGES] ({currentPath.blocked_edges.length}) — expand
                </summary>
                <ul className="pl-3 border-l border-red-900/40 space-y-0.5 mt-0.5 text-red-500/80">
                  {currentPath.blocked_edges.map((be, i) => (
                    <li key={i}>
                      {be.from} → {be.to}{" // "}{be.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
