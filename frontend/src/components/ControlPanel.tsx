"use client";

import type { AirportNode, NfzZone } from "@/types";

interface ControlPanelProps {
  airports: AirportNode[];
  nfzZones: NfzZone[];
  selectedOrigin: string | null;
  selectedDest: string | null;
  selectedAlgo: "dijkstra" | "astar";
  isLoading: boolean;
  onSelectOrigin: (iata: string | null) => void;
  onSelectDest: (iata: string | null) => void;
  onSelectAlgo: (algo: "dijkstra" | "astar") => void;
  onToggleNfz: (id: string, active: boolean) => void;
  onFindRoute: () => void;
}

export default function ControlPanel({
  airports,
  nfzZones,
  selectedOrigin,
  selectedDest,
  selectedAlgo,
  isLoading,
  onSelectOrigin,
  onSelectDest,
  onSelectAlgo,
  onToggleNfz,
  onFindRoute,
}: ControlPanelProps) {
  const canSearch =
    selectedOrigin !== null &&
    selectedDest !== null &&
    selectedOrigin !== selectedDest &&
    !isLoading;

  return (
    <div className="flex flex-col gap-6 text-xs tracking-widest text-zinc-400 h-full font-mono">
      <div className="text-[#EBA5FA] font-bold border-b border-[#2d2a35] pb-2">
        FLIGHT PARAMETERS
      </div>

      {/* ── Airport Selectors ── */}
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="origin-select" className="block text-[10px] text-zinc-500 mb-2">
            DEPARTURE POINT
          </label>
          <div className="relative">
            <select
              id="origin-select"
              value={selectedOrigin ?? ""}
              onChange={(e) =>
                onSelectOrigin(e.target.value === "" ? null : e.target.value)
              }
              className="w-full bg-[#0a090c] border border-[#2d2a35] rounded px-4 py-3 appearance-none focus:outline-none focus:border-zinc-500 text-zinc-300 text-xs font-mono"
            >
              <option value="">SELECT_COORD</option>
              {airports.map((a) => (
                <option key={a.iata} value={a.iata} disabled={a.iata === selectedDest}>
                  {a.iata} - {a.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="dest-select" className="block text-[10px] text-zinc-500 mb-2">
            ARRIVAL DESTINATION
          </label>
          <div className="relative">
            <select
              id="dest-select"
              value={selectedDest ?? ""}
              onChange={(e) =>
                onSelectDest(e.target.value === "" ? null : e.target.value)
              }
              className="w-full bg-[#0a090c] border border-[#2d2a35] rounded px-4 py-3 appearance-none focus:outline-none focus:border-zinc-500 text-zinc-300 text-xs font-mono"
            >
              <option value="">SELECT_COORD</option>
              {airports.map((a) => (
                <option key={a.iata} value={a.iata} disabled={a.iata === selectedOrigin}>
                  {a.iata} - {a.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Algorithm Toggle ── */}
      <div className="flex justify-between items-end border-b border-[#2d2a35] pb-2 mt-2">
        <div className="text-[#EBA5FA] font-bold">ALGORITHM</div>
        <div className="text-[10px] text-zinc-600">PATHFINDING</div>
      </div>
      <div className="bg-[#0a090c] border border-[#2d2a35] rounded p-1 flex">
        <button
          type="button"
          className={`flex-1 py-2 text-center rounded transition-colors ${
            selectedAlgo === "dijkstra"
              ? "bg-[#2d2a35] text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => onSelectAlgo("dijkstra")}
        >
          DIJKSTRA
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-center rounded transition-colors ${
            selectedAlgo === "astar"
              ? "bg-[#2d2a35] text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => onSelectAlgo("astar")}
        >
          A_STAR
        </button>
      </div>

      {/* ── NFZ Toggle Checklist ── */}
      <div className="flex justify-between items-end border-b border-[#2d2a35] pb-2 mt-2">
        <div className="text-[#EBA5FA] font-bold">SUB-SYSTEMS (NFZ)</div>
        <div className="text-[10px] text-zinc-600">RESTRICTED_AIRSPACE</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {nfzZones.length === 0 && (
          <p className="col-span-2 text-[10px] text-zinc-600 text-center py-4">
            NO_ZONES_DETECTED
          </p>
        )}
        {nfzZones.map((zone) => (
          <label
            key={zone.id}
            className={`flex flex-col items-center justify-center p-3 border rounded cursor-pointer transition-colors ${
              zone.active
                ? "border-[#EBA5FA] bg-[#EBA5FA]/10 text-[#EBA5FA]"
                : "border-[#2d2a35] bg-[#0a090c] text-zinc-500 hover:border-zinc-500"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={zone.active}
              onChange={(e) => onToggleNfz(zone.id, e.target.checked)}
            />
            {zone.type === "circle" ? (
              <svg className="w-5 h-5 mb-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mb-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2l8 6v8l-8 6-8-6V8l8-6z" />
              </svg>
            )}
            <span className="text-[9px] text-center max-w-full truncate">
              {zone.name.toUpperCase()}
            </span>
            <span className="text-[10px] mt-1 font-bold">
              {zone.active ? "ACTIVE" : "OFFLINE"}
            </span>
          </label>
        ))}
      </div>

      {/* ── Search Button ── */}
      <div className="mt-auto pt-8">
        <button
          type="button"
          disabled={!canSearch}
          onClick={onFindRoute}
          className="w-full py-3 bg-transparent border border-zinc-500 text-zinc-300 font-bold rounded tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:border-[#2d2a35] disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? "CALCULATING_VECTOR..." : "RECALCULATE_VECTOR"}
        </button>
      </div>
    </div>
  );
}
