"use client";

import { motion, AnimatePresence } from "framer-motion";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "QUICK START",
    items: [
      "Select DEPARTURE POINT in the right panel dropdown",
      "Select ARRIVAL DESTINATION in the right panel dropdown",
      "Choose algorithm: DIJKSTRA / A_STAR / BIDIR",
      "Toggle NFZ zones to activate airspace restrictions",
      'Click RECALCULATE_VECTOR or INIT_SEQUENCE to compute the route',
    ],
  },
  {
    title: "ALGORITHMS",
    items: [
      "DIJKSTRA — Guaranteed shortest path, explores all directions, O((V+E)logV)",
      "A_STAR — Haversine heuristic speeds up search on geospatial networks",
      "BIDIR — Two simultaneous Dijkstra searches meeting in the middle",
      "K-SHORTEST — Yen's algorithm auto-computes 3 alternative paths (shown as faded arcs)",
    ],
  },
  {
    title: "MAP INTERACTIONS",
    items: [
      "Click any airport marker to set it as ORIGIN or DESTINATION",
      "First click sets ORIGIN — second click sets DESTINATION",
      "Clicking a different node while both are set resets ORIGIN",
      "Route arcs follow great-circle paths (SLERP interpolation)",
      "Faded cyan / orange arcs = K-shortest alternative paths",
    ],
  },
  {
    title: "NFZ CONSTRAINTS",
    items: [
      "Toggle NFZ zones in the FLIGHT PARAMETERS panel",
      "Active NFZ zones mask all route edges that intersect the zone",
      "Route recalculates automatically after any NFZ change",
      "Orange route arc = recalculated route due to active NFZ restrictions",
    ],
  },
  {
    title: "DASHBOARD TABS",
    items: [
      "ROUTE_PLAN — Main map, algorithm controls, and route output",
      "FLEET_ALT / TELEMETRY — Live telemetry display; FILE FLIGHT PLAN exports a .txt plan",
      "SYS_STATUS — Network metrics, hub ranking, NFZ matrix, last route summary",
      "LOGS — Full system event log with filter (TRAFFIC / PATH / NFZ / ERROR) and copy",
    ],
  },
  {
    title: "SETTINGS",
    items: [
      "Open SETTINGS via the sidebar bottom button or the ⚙️ icon",
      "Switch between LIGHT and DARK themes (map tiles switch automatically)",
      "Change the default pathfinding algorithm",
      "Toggle node-by-node exploration animation on/off",
    ],
  },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[2000] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-full max-w-2xl font-mono"
            style={{ maxHeight: "80vh" }}
          >
            <div
              className="glass-panel-solid rounded-2xl shadow-2xl flex flex-col"
              style={{ maxHeight: "80vh", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-xs text-outline tracking-widest mb-0.5" style={{ fontFamily: "JetBrains Mono, monospace" }}>DOKUMENTASI</div>
                  <h2 className="text-xl font-bold text-on-surface" style={{ fontFamily: "var(--font-sora), Sora, sans-serif" }}>Bantuan Sistem</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-outline hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-lg glass-panel text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {SECTIONS.map((sec, si) => (
                  <motion.div
                    key={sec.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.06 }}
                  >
                    <div
                      className="text-xs text-primary font-semibold tracking-widest mb-3 pb-1"
                      style={{ fontFamily: "JetBrains Mono, monospace", borderBottom: "1px solid rgba(208,188,255,0.15)" }}
                    >
                      {sec.title}
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {sec.items.map((item, ii) => (
                        <li key={ii} className="text-sm text-on-surface-variant flex gap-2" style={{ fontFamily: "Inter, sans-serif" }}>
                          <span className="text-primary select-none shrink-0 mt-0.5">›</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 shrink-0 flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs text-outline" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  SkyRoute Analytics v3.44.0
                </span>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all glass-panel text-on-surface-variant hover:text-on-surface"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Tutup
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
