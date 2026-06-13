"use client";

import { motion } from "framer-motion";
import type { AirportNode, NfzZone, AlgoType } from "@/types";

interface ControlPanelProps {
  airports: AirportNode[];
  nfzZones: NfzZone[];
  selectedOrigin: string | null;
  selectedDest: string | null;
  selectedAlgo: AlgoType;
  isLoading: boolean;
  animateExploration: boolean;
  onSelectOrigin: (iata: string | null) => void;
  onSelectDest: (iata: string | null) => void;
  onSelectAlgo: (algo: AlgoType) => void;
  onToggleNfz: (id: string, active: boolean) => void;
  onFindRoute: () => void;
  onToggleAnimate: (val: boolean) => void;
}

const ALGO_OPTIONS: { value: AlgoType; label: string; desc: string }[] = [
  { value: "dijkstra", label: "DIJKSTRA", desc: "O((V+E)logV)" },
  { value: "astar",    label: "A_STAR",   desc: "Heuristic" },
  { value: "bidir",    label: "BIDIR",    desc: "Bidirectional" },
];

export default function ControlPanel({
  airports,
  nfzZones,
  selectedOrigin,
  selectedDest,
  selectedAlgo,
  isLoading,
  animateExploration,
  onSelectOrigin,
  onSelectDest,
  onSelectAlgo,
  onToggleNfz,
  onFindRoute,
  onToggleAnimate,
}: ControlPanelProps) {
  const canSearch =
    selectedOrigin !== null &&
    selectedDest !== null &&
    selectedOrigin !== selectedDest &&
    !isLoading;

  const selectCls =
    "w-full border rounded-lg px-3 py-2.5 appearance-none focus:outline-none text-xs font-mono tracking-wider transition-colors"
    + " focus:border-secondary"
    + " bg-surface-container-high border-outline-variant text-on-surface";

  return (
    <div className="flex flex-col gap-5 text-xs tracking-widest text-outline h-full font-mono">
      <div
        className="text-primary font-semibold pb-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}
      >
        FLIGHT PARAMETERS
      </div>

      {/* ── Airport Selectors ── */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[10px] text-outline mb-1.5" style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
            DEPARTURE
          </label>
          <div className="relative">
            <select
              value={selectedOrigin ?? ""}
              onChange={(e) => onSelectOrigin(e.target.value || null)}
              className={selectCls}
            >
              <option value="">SELECT_COORD</option>
              {airports.map((a) => (
                <option key={a.iata} value={a.iata} disabled={a.iata === selectedDest}>
                  {a.iata} – {a.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-outline mb-1.5" style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
            DESTINATION
          </label>
          <div className="relative">
            <select
              value={selectedDest ?? ""}
              onChange={(e) => onSelectDest(e.target.value || null)}
              className={selectCls}
            >
              <option value="">SELECT_COORD</option>
              {airports.map((a) => (
                <option key={a.iata} value={a.iata} disabled={a.iata === selectedOrigin}>
                  {a.iata} – {a.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Algorithm Toggle ── */}
      <div>
        <div className="flex justify-between items-end pb-1.5 mb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-primary font-semibold text-[11px] tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>ALGORITHM</div>
          <div className="text-[9px] text-outline">PATHFINDING</div>
        </div>
        <div
          className="glass-panel rounded-xl p-0.5 flex gap-0.5"
        >
          {ALGO_OPTIONS.map(({ value, label, desc }) => (
            <motion.button
              key={value}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectAlgo(value)}
              className="flex-1 py-2 text-center rounded-lg transition-all text-[9px] leading-tight"
              style={selectedAlgo === value ? {
                background: "rgba(208,188,255,0.15)",
                color: "#d0bcff",
                border: "1px solid rgba(208,188,255,0.2)",
              } : {
                color: "#958ea0",
                border: "1px solid transparent",
              }}
              title={desc}
            >
              <div style={{ fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
              <div className="text-[8px] opacity-50 mt-0.5">{desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Options ── */}
      <div>
        <div className="flex justify-between items-end pb-1.5 mb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-primary font-semibold text-[11px] tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>OPTIONS</div>
        </div>
        <motion.label
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div
            onClick={() => onToggleAnimate(!animateExploration)}
            className="w-8 h-4 rounded-full transition-all relative cursor-pointer"
            style={{ background: animateExploration ? "#d0bcff" : "rgba(255,255,255,0.1)" }}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                animateExploration ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-outline text-[10px]" style={{ fontFamily: "Inter, sans-serif" }}>Animasi Eksplorasi</span>
        </motion.label>
      </div>

      {/* ── NFZ Sub-Systems ── */}
      <div>
        <div className="flex justify-between items-end pb-1.5 mb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-primary font-semibold text-[11px] tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>NFZ ZONES</div>
          <div className="text-[9px] text-outline">RESTRICTED</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {nfzZones.length === 0 && (
            <p className="col-span-2 text-[10px] text-sky-muted text-center py-4">
              NO_ZONES_DETECTED
            </p>
          )}
          {nfzZones.map((zone) => (
            <motion.label
              key={zone.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all"
              style={zone.active ? {
                border: "1px solid rgba(208,188,255,0.3)",
                background: "rgba(208,188,255,0.1)",
                color: "#d0bcff",
              } : {
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                color: "#958ea0",
              }}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={zone.active}
                onChange={(e) => onToggleNfz(zone.id, e.target.checked)}
              />
              {zone.type === "circle" ? (
                <svg className="w-4 h-4 mb-1.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mb-1.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2l8 6v8l-8 6-8-6V8l8-6z" />
                </svg>
              )}
              <span className="text-[8px] text-center max-w-full truncate leading-tight">
                {zone.name.toUpperCase()}
              </span>
              <span className="text-[9px] mt-1 font-bold">
                {zone.active ? "ACTIVE" : "OFFLINE"}
              </span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* ── Search Button ── */}
      <div className="mt-auto pt-4">
        <motion.button
          type="button"
          disabled={!canSearch}
          onClick={onFindRoute}
          whileTap={canSearch ? { scale: 0.97 } : {}}
          className="w-full py-3 font-bold rounded-xl tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          style={canSearch ? {
            background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)",
            color: "#3c0091",
            boxShadow: "0 0 20px rgba(208,188,255,0.25)",
            fontFamily: "Inter, sans-serif",
          } : {
            background: "rgba(255,255,255,0.05)",
            color: "#958ea0",
            border: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {isLoading ? "Menghitung Rute..." : "Hitung Rute Optimal"}
        </motion.button>
      </div>
    </div>
  );
}
