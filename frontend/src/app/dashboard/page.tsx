"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import type {
  AirportNode,
  GraphEdge,
  NfzZone,
  RouteResponse,
} from "@/types";
import {
  fetchGraph,
  fetchNfz,
  postRoute,
  toggleNfz,
} from "@/lib/api";

import ControlPanel from "@/components/ControlPanel";
import ResultPanel from "@/components/ResultPanel";
import TelemetryWorkspace from "@/components/TelemetryWorkspace";

// Leaflet requires `window` — dynamically import MapView with SSR disabled
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a090c",
        color: "#9CA3AF",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      [SYSTEM] INITIALIZING_RADAR...
    </div>
  ),
});

export default function Home() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // §3.1 — Static data (loaded once on mount)
  // ---------------------------------------------------------------------------
  const [airports, setAirports] = useState<AirportNode[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [nfzZones, setNfzZones] = useState<NfzZone[]>([]);

  // ---------------------------------------------------------------------------
  // §3.1 — User input
  // ---------------------------------------------------------------------------
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<"dijkstra" | "astar">(
    "dijkstra"
  );

  // ---------------------------------------------------------------------------
  // §3.1 — Routing result
  // ---------------------------------------------------------------------------
  const [currentPath, setCurrentPath] = useState<RouteResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // §3.1 — UI state
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<"ROUTE_PLAN" | "FLEET_ALT">("ROUTE_PLAN");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // §3.2 — URL Query Sync
  // ---------------------------------------------------------------------------
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "ROUTE_PLAN" || tabParam === "FLEET_ALT") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // ---------------------------------------------------------------------------
  // Data loading — runs once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadData() {
      try {
        const [graphData, nfzData] = await Promise.all([
          fetchGraph(),
          fetchNfz(),
        ]);
        setAirports(graphData.nodes);
        setGraphEdges(graphData.edges);
        setNfzZones(nfzData.nfz_zones);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load initial data."
        );
      }
    }
    loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // §3.2 — Clear route when origin or destination changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setCurrentPath(null);
    setLogs([]);
  }, [selectedOrigin, selectedDest]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Request route calculation via API layer */
  const handleFindRoute = useCallback(async () => {
    if (!selectedOrigin || !selectedDest) return;

    if (selectedOrigin === selectedDest) {
      setCurrentPath(null);
      const ts = new Date().toISOString().substring(11, 19);
      setLogs((prev) => [...prev, `[${ts}] ERROR: Departure point and destination cannot be identical.`]);
      return;
    }

    setIsLoading(true);
    setError(null);
    const tsStart = new Date().toISOString().substring(11, 19);
    setLogs((prev) => [
      ...prev,
      `[${tsStart}] TRAFFIC_ADVISORY: Checking active airspace constraints for ${selectedOrigin} → ${selectedDest}`,
      `[${tsStart}] VECTOR_CALCULATION: Phase 1 complete. Algorithm: ${selectedAlgo.toUpperCase()}`,
    ]);

    try {
      const result = await postRoute({
        origin: selectedOrigin,
        destination: selectedDest,
        algo: selectedAlgo,
      });
      setCurrentPath(result);
      const tsEnd = new Date().toISOString().substring(11, 19);
      setLogs((prev) => [...prev, `[${tsEnd}] VECTOR_CALCULATION: Path resolved. Distance: ${result.total_distance.toFixed(2)} km.`]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Route calculation failed.";
      setError(msg);
      const tsError = new Date().toISOString().substring(11, 19);
      const prefix = msg.startsWith("NETWORK") ? "" : "ERROR: ";
      setLogs((prev) => [...prev, `[${tsError}] ${prefix}${msg}`]);
      setCurrentPath(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrigin, selectedDest, selectedAlgo]);

  /** Toggle an NFZ zone — recalculates route if one is active */
  const handleToggleNfz = useCallback(
    async (id: string, active: boolean) => {
      // Optimistically update local state
      setNfzZones((prev) =>
        prev.map((z) => (z.id === id ? { ...z, active } : z))
      );

      try {
        await toggleNfz(id, active);

        // If a route is currently displayed, recalculate it
        if (currentPath && selectedOrigin && selectedDest) {
          setIsRecalculating(true);
          const newRoute = await postRoute({
            origin: selectedOrigin,
            destination: selectedDest,
            algo: selectedAlgo,
          });
          setCurrentPath(newRoute);
          setIsRecalculating(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "NFZ toggle failed."
        );
        setIsRecalculating(false);
      }
    },
    [currentPath, selectedOrigin, selectedDest, selectedAlgo]
  );

  /** Select airport from map marker click */
  const handleSelectAirport = useCallback(
    (iata: string) => {
      if (!selectedOrigin) {
        setSelectedOrigin(iata);
      } else if (!selectedDest && iata !== selectedOrigin) {
        setSelectedDest(iata);
      } else if (iata !== selectedDest) {
        // Replace origin if both are already set
        setSelectedOrigin(iata);
      }
    },
    [selectedOrigin, selectedDest]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="animate-fade-in flex flex-col h-screen bg-[#110f15] text-zinc-400 font-mono overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2d2a35] bg-[#1a1820]">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black tracking-widest text-[#EBA5FA] drop-shadow-[0_0_8px_rgba(235,165,250,0.5)]">
            AERO_OS_V3.0
          </div>
          <nav className="hidden md:flex gap-6 text-xs tracking-widest font-semibold ml-4">
            <span className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded text-zinc-300 border border-zinc-700/50">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              NETWORK: ACTIVE
            </span>
            <span 
              onClick={() => router.push("/")}
              className="flex items-center gap-2 hover:text-zinc-200 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              HOME
            </span>
            <span className="flex items-center gap-2 hover:text-zinc-200 cursor-pointer transition-colors">
              FLIGHT
            </span>
            <span 
              onClick={() => setActiveTab("ROUTE_PLAN")}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === "ROUTE_PLAN" ? "text-[#EBA5FA] border-b-2 border-[#EBA5FA] pb-1" : "hover:text-zinc-200"
              }`}
            >
              RADAR
            </span>
            <span 
              onClick={() => setActiveTab("FLEET_ALT")}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === "FLEET_ALT" ? "text-[#EBA5FA] border-b-2 border-[#EBA5FA] pb-1" : "hover:text-zinc-200"
              }`}
            >
              TELEMETRY
            </span>
            <span className="flex items-center gap-2 hover:text-zinc-200 cursor-pointer transition-colors">
              COMMS
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <svg className="w-5 h-5 cursor-pointer hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <svg className="w-5 h-5 cursor-pointer hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="w-8 h-8 rounded-full border border-zinc-600 bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer">
            <svg className="w-5 h-5 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-64 border-r border-[#2d2a35] bg-[#1a1820] flex flex-col justify-between py-6">
          <div>
            <h2 className="text-[#EBA5FA] text-2xl font-bold px-6 tracking-widest drop-shadow-[0_0_4px_rgba(235,165,250,0.5)]">
              OPERATIONS
            </h2>
            <p className="text-xs text-zinc-500 px-6 mt-1 tracking-[0.2em] mb-8">
              SECTOR_7G
            </p>
            <nav className="flex flex-col text-sm tracking-widest text-zinc-400">
              <div className="px-6 py-3 hover:bg-zinc-800/50 cursor-pointer flex items-center gap-3 transition-colors">
                <span className="opacity-60 text-lg">📊</span> SYS_STATUS
              </div>
              <div
                onClick={() => setActiveTab('ROUTE_PLAN')}
                className={`px-6 py-3 cursor-pointer flex items-center gap-3 transition-colors ${activeTab === 'ROUTE_PLAN' ? 'bg-zinc-800/80 border-l-4 border-[#EBA5FA] text-zinc-200' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
              >
                <span className={`text-lg ${activeTab === 'ROUTE_PLAN' ? 'opacity-80' : 'opacity-60'}`}>🗺️</span> ROUTE_PLAN
              </div>
              <div
                onClick={() => setActiveTab('FLEET_ALT')}
                className={`px-6 py-3 cursor-pointer flex items-center gap-3 transition-colors ${activeTab === 'FLEET_ALT' ? 'bg-zinc-800/80 border-l-4 border-[#EBA5FA] text-zinc-200' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
              >
                <span className={`text-lg ${activeTab === 'FLEET_ALT' ? 'opacity-80' : 'opacity-60'}`}>✈️</span> FLEET_ALT
              </div>
              <div className="px-6 py-3 hover:bg-zinc-800/50 cursor-pointer flex items-center gap-3 transition-colors">
                <span className="opacity-60 text-lg">›_</span> LOGS
              </div>
            </nav>
          </div>
          <div className="px-6">
            <button
              onClick={handleFindRoute}
              className="w-full py-3 bg-[#EBA5FA] text-zinc-900 font-bold tracking-widest rounded text-xs hover:bg-[#f1bcfd] transition-colors"
            >
              INIT_SEQUENCE
            </button>
            <div className="mt-4 flex flex-col gap-2 text-xs tracking-widest text-zinc-500">
              <span className="cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-2">
                ⚙️ SETTINGS
              </span>
              <span className="cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-2">
                ❓ HELP
              </span>
            </div>
          </div>
        </aside>

        {/* ── Dynamic Workspace Area ── */}
        {activeTab === "ROUTE_PLAN" ? (
          <>
            {/* ── Center Area ── */}
            <section className="flex flex-col flex-1 p-4 bg-[#0a090c] gap-4 relative">
          <div className="flex-1 border border-[#2d2a35] rounded-lg overflow-hidden relative">
            <MapView
              airports={airports}
              nfzZones={nfzZones}
              activeRoute={currentPath}
              selectedOrigin={selectedOrigin}
              selectedDest={selectedDest}
              onSelectAirport={handleSelectAirport}
            />
            {/* Overlay Info Panel */}
            <div className="absolute top-4 left-4 border border-[#2d2a35] bg-[#1a1820]/90 p-4 text-xs tracking-widest z-[1000] rounded w-64 shadow-xl pointer-events-none">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-500">ACTIVE VECTOR</span>
                <span className="text-cyan-400">v3.44.0</span>
              </div>
              <div className="h-px w-full bg-[#2d2a35] mb-2"></div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500">COORD_X</span>
                <span className="text-cyan-400">142.029</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500">COORD_Y</span>
                <span className="text-cyan-400">-34.112</span>
              </div>
            </div>
          </div>

          <div className="h-48 border border-[#2d2a35] bg-[#1a1820] rounded-lg flex flex-col overflow-hidden">
            <div className="flex items-center px-4 py-2 border-b border-[#2d2a35] gap-4 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#EBA5FA] animate-pulse"></div>
              <span className="tracking-widest text-[#EBA5FA] font-bold border-b-2 border-[#EBA5FA] py-1">
                SYSTEM_EVENT_LOG.STREAM
              </span>
              <span className="ml-auto text-zinc-600 tracking-widest">
                UTF-8 // SECTOR_7G
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-[#0a090c] shadow-inner">
              <ResultPanel
                currentPath={currentPath}
                isLoading={isLoading}
                isRecalculating={isRecalculating}
                logs={logs}
              />
            </div>
          </div>
        </section>

        {/* ── Right Sidebar ── */}
        <aside className="w-[340px] border-l border-[#2d2a35] bg-[#1a1820] flex flex-col p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-4 py-3 rounded text-xs tracking-widest mb-6 break-words">
              [ERROR] {error}
            </div>
          )}
          <ControlPanel
            airports={airports}
            nfzZones={nfzZones}
            selectedOrigin={selectedOrigin}
            selectedDest={selectedDest}
            selectedAlgo={selectedAlgo}
            isLoading={isLoading}
            onSelectOrigin={setSelectedOrigin}
            onSelectDest={setSelectedDest}
            onSelectAlgo={setSelectedAlgo}
            onToggleNfz={handleToggleNfz}
            onFindRoute={handleFindRoute}
          />
        </aside>
          </>
        ) : (
          <TelemetryWorkspace />
        )}
      </div>
    </div>
  );
}
