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
    "w-full bg-sky-bg border border-sky-border rounded px-3 py-2.5 appearance-none focus:outline-none focus:border-sky-cyan text-sky-text text-[11px] font-mono tracking-wider";

  return (
    <div className="flex flex-col gap-5 text-[11px] tracking-widest text-sky-muted h-full font-mono">
      <div className="text-sky-accent font-bold border-b border-sky-border pb-2">
        FLIGHT PARAMETERS
      </div>

      {/* ── Airport Selectors ── */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[10px] text-sky-muted mb-1.5">
            DEPARTURE POINT
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
          <label className="block text-[10px] text-sky-muted mb-1.5">
            ARRIVAL DESTINATION
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
        <div className="flex justify-between items-end border-b border-sky-border pb-1.5 mb-3">
          <div className="text-sky-accent font-bold">ALGORITHM</div>
          <div className="text-[9px] text-sky-muted">PATHFINDING</div>
        </div>
        <div className="bg-sky-bg border border-sky-border rounded p-0.5 flex gap-0.5">
          {ALGO_OPTIONS.map(({ value, label, desc }) => (
            <motion.button
              key={value}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectAlgo(value)}
              className={`flex-1 py-2 text-center rounded transition-colors text-[9px] leading-tight ${
                selectedAlgo === value
                  ? "bg-sky-surface text-sky-text border border-sky-border"
                  : "text-sky-muted hover:text-sky-text"
              }`}
              title={desc}
            >
              <div>{label}</div>
              <div className="text-[8px] opacity-50 mt-0.5">{desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Options ── */}
      <div>
        <div className="flex justify-between items-end border-b border-sky-border pb-1.5 mb-3">
          <div className="text-sky-accent font-bold">OPTIONS</div>
        </div>
        <motion.label
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div
            onClick={() => onToggleAnimate(!animateExploration)}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              animateExploration ? "bg-sky-accent" : "bg-sky-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                animateExploration ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sky-muted text-[10px]">ANIMATE EXPLORATION</span>
        </motion.label>
      </div>

      {/* ── NFZ Sub-Systems ── */}
      <div>
        <div className="flex justify-between items-end border-b border-sky-border pb-1.5 mb-3">
          <div className="text-sky-accent font-bold">SUB-SYSTEMS (NFZ)</div>
          <div className="text-[9px] text-sky-muted">RESTRICTED</div>
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
              className={`flex flex-col items-center justify-center p-2.5 border rounded cursor-pointer transition-colors ${
                zone.active
                  ? "border-sky-accent bg-sky-accent/10 text-sky-accent"
                  : "border-sky-border bg-sky-bg text-sky-muted hover:border-sky-muted"
              }`}
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
          className="w-full py-2.5 bg-transparent border border-sky-muted text-sky-text font-bold rounded tracking-widest hover:border-sky-accent hover:text-sky-accent disabled:opacity-40 disabled:border-sky-border disabled:text-sky-muted disabled:cursor-not-allowed transition-all text-[11px]"
        >
          {isLoading ? "CALCULATING_VECTOR..." : "RECALCULATE_VECTOR"}
        </motion.button>
      </div>
    </div>
  );
}
