"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

import type {
  AirportNode,
  GraphEdge,
  GraphData,
  NfzZone,
  RouteResponse,
  AlgoType,
  AlgorithmStep,
} from "@/types";
import type { AlgorithmResult } from "@/lib/algorithms";
import {
  computeRoute,
  yenKShortest,
  computeBlockedEdges,
} from "@/lib/algorithms";
import { toggleNfz, postRoute } from "@/lib/api";

import ControlPanel from "@/components/ControlPanel";
import ResultPanel from "@/components/ResultPanel";
import TelemetryWorkspace from "@/components/TelemetryWorkspace";
import SysStatusWorkspace from "@/components/SysStatusWorkspace";
import LogsWorkspace from "@/components/LogsWorkspace";
import SettingsModal from "@/components/SettingsModal";
import HelpModal from "@/components/HelpModal";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        minHeight: "400px",
        background: "var(--surface-container-low)",
        color: "var(--outline)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "12px",
        letterSpacing: "0.1em",
      }}
    >
      INITIALIZING RADAR...
    </div>
  ),
});

type TabType = "ROUTE_PLAN" | "FLEET_ALT" | "SYS_STATUS" | "LOGS";

// ─── Sidebar nav config ───────────────────────────────────────────────────────
const NAV_ITEMS: { icon: string; label: string; tab: TabType }[] = [
  { icon: "map",                      label: "Peta Rute",      tab: "ROUTE_PLAN" },
  { icon: "flight",                   label: "Telemetri",      tab: "FLEET_ALT"  },
  { icon: "query_stats",              label: "Status Jaringan",tab: "SYS_STATUS" },
  { icon: "terminal",                 label: "Log Aktivitas",  tab: "LOGS"       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Content
// ─────────────────────────────────────────────────────────────────────────────
function DashboardContent() {
  const router = useRouter();

  // ── Graph data ──
  const [airports, setAirports] = useState<AirportNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [nfzZones, setNfzZones] = useState<NfzZone[]>([]);

  // ── User input ──
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoType>("dijkstra");
  const [animateExploration, setAnimateExploration] = useState(true);

  // ── Routing result ──
  const [currentPath, setCurrentPath] = useState<AlgorithmResult | null>(null);
  const [kPaths, setKPaths] = useState<Array<{ path: string[]; cost: number }>>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // ── Animation state ──
  const [animationSteps, setAnimationSteps] = useState<AlgorithmStep[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<TabType>("ROUTE_PLAN");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── URL Query Sync ──
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (
      tabParam === "ROUTE_PLAN" ||
      tabParam === "FLEET_ALT" ||
      tabParam === "SYS_STATUS" ||
      tabParam === "LOGS"
    ) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  // ── Load graph + NFZ ──
  useEffect(() => {
    async function loadData() {
      try {
        const [gd, nfzRaw] = await Promise.all([
          fetch("/data/graph.json").then((r) => r.json() as Promise<GraphData>),
          fetch("/data/nfz.json").then((r) => r.json() as Promise<{ nfz_zones: NfzZone[] }>),
        ]);
        setAirports(gd.nodes);
        setGraphEdges(gd.edges);
        setGraphData(gd);
        setNfzZones(nfzRaw.nfz_zones);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load network data.");
      }
    }
    loadData();
  }, []);

  // ── Clear route on input change ──
  useEffect(() => {
    setCurrentPath(null);
    setKPaths([]);
    setAnimationSteps([]);
    setIsAnimating(false);
  }, [selectedOrigin, selectedDest]);

  // ─────────────────────────────────────────────────────────────────────────
  // Route calculation — tries FastAPI backend, falls back to client-side
  // ─────────────────────────────────────────────────────────────────────────
  const handleFindRoute = useCallback(async () => {
    if (!selectedOrigin || !selectedDest || !graphData) return;

    if (selectedOrigin === selectedDest) {
      const ts = new Date().toISOString().substring(11, 19);
      setLogs((p) => [...p, `[${ts}] ERROR: Departure and destination cannot be identical.`]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsAnimating(false);
    setAnimationSteps([]);

    const ts0 = new Date().toISOString().substring(11, 19);
    setLogs((p) => [
      ...p,
      `[${ts0}] TRAFFIC_ADVISORY: Checking constraints for ${selectedOrigin} → ${selectedDest}`,
      `[${ts0}] VECTOR_CALC: Running ${selectedAlgo.toUpperCase()} on ${airports.length} nodes`,
    ]);

    await new Promise((r) => setTimeout(r, 12));

    try {
      let result: AlgorithmResult;

      // Try FastAPI backend first
      try {
        const apiRes = await postRoute({
          origin: selectedOrigin,
          destination: selectedDest,
          algo: selectedAlgo,
        });
        result = {
          ...apiRes,
          steps: [],
          nodesExplored: (apiRes as unknown as AlgorithmResult).nodesExplored ?? 0,
          timeMs: (apiRes as unknown as AlgorithmResult).timeMs ?? 0,
          algo: selectedAlgo,
        };
        setLogs((p) => [...p, `[${ts0}] API: Backend FastAPI responded`]);
      } catch {
        // Fallback to client-side computation
        result = computeRoute({
          origin: selectedOrigin,
          destination: selectedDest,
          algo: selectedAlgo,
          graphData,
          nfzZones,
          trackSteps: animateExploration,
        });
        setLogs((p) => [...p, `[${ts0}] API: Using client-side fallback`]);
      }

      setCurrentPath(result);

      const ts1 = new Date().toISOString().substring(11, 19);
      setLogs((p) => [
        ...p,
        `[${ts1}] PATH_RESOLVED: ${result.path.join(" → ")} // ${result.total_distance.toFixed(0)} km // ${result.nodesExplored} nodes // ${result.timeMs}ms`,
      ]);

      if (animateExploration && result.steps.length > 0) {
        setAnimationSteps(result.steps);
        setIsAnimating(true);
        const dur = result.steps.length * 75 + 500;
        setTimeout(() => setIsAnimating(false), dur);
      }

      try {
        const { masked } = computeBlockedEdges(
          graphData.edges,
          graphData.nodes,
          nfzZones.filter((z) => z.active)
        );
        const kResults = yenKShortest(graphData.nodes, graphData.edges, masked, selectedOrigin, selectedDest, 3);
        setKPaths(kResults);
      } catch { /* K-shortest non-critical */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Route calculation failed.";
      setError(msg);
      const ts2 = new Date().toISOString().substring(11, 19);
      setLogs((p) => [...p, `[${ts2}] ERROR: ${msg}`]);
      setCurrentPath(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrigin, selectedDest, selectedAlgo, graphData, nfzZones, airports.length, animateExploration]);

  // ─────────────────────────────────────────────────────────────────────────
  // NFZ toggle
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleNfz = useCallback(
    async (id: string, active: boolean) => {
      const updatedZones = nfzZones.map((z) => (z.id === id ? { ...z, active } : z));
      setNfzZones(updatedZones);
      await toggleNfz(id, active);

      if (currentPath && selectedOrigin && selectedDest && graphData) {
        setIsRecalculating(true);
        await new Promise((r) => setTimeout(r, 12));
        try {
          const newRoute = computeRoute({
            origin: selectedOrigin,
            destination: selectedDest,
            algo: selectedAlgo,
            graphData,
            nfzZones: updatedZones,
            trackSteps: false,
          });
          setCurrentPath(newRoute);
          const ts = new Date().toISOString().substring(11, 19);
          setLogs((p) => [...p, `[${ts}] NFZ_RECALC: ${id} (${active ? "activated" : "deactivated"}) → ${newRoute.path.join(" → ")}`]);
          try {
            const { masked } = computeBlockedEdges(graphData.edges, graphData.nodes, updatedZones.filter((z) => z.active));
            const kResults = yenKShortest(graphData.nodes, graphData.edges, masked, selectedOrigin, selectedDest, 3);
            setKPaths(kResults);
          } catch { /* silent */ }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "NFZ recalculation failed.";
          setError(msg);
        } finally {
          setIsRecalculating(false);
        }
      }
    },
    [currentPath, selectedOrigin, selectedDest, selectedAlgo, graphData, nfzZones]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Map click
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectAirport = useCallback(
    (iata: string) => {
      if (!selectedOrigin) {
        setSelectedOrigin(iata);
      } else if (!selectedDest && iata !== selectedOrigin) {
        setSelectedDest(iata);
      } else if (iata !== selectedDest) {
        setSelectedOrigin(iata);
        setSelectedDest(null);
      }
    },
    [selectedOrigin, selectedDest]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#15121b", color: "#e7e0ed" }}
    >
      {/* Background orbs */}
      <div className="fixed pointer-events-none" style={{ top: "-80px", left: "-80px", zIndex: 0 }}>
        <div className="orb-purple" style={{ width: "400px", height: "400px" }} />
      </div>
      <div className="fixed pointer-events-none" style={{ bottom: "-80px", right: "-80px", zIndex: 0 }}>
        <div className="orb-cyan" style={{ width: "350px", height: "350px" }} />
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultAlgo={selectedAlgo}
        onChangeAlgo={setSelectedAlgo}
        animateExploration={animateExploration}
        onChangeAnimate={setAnimateExploration}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* ── Fixed Sidebar ── */}
      <aside
        className="fixed top-0 left-0 bottom-0 flex flex-col glass-panel-solid"
        style={{ width: "280px", zIndex: 30, borderTop: "none", borderBottom: "none", borderLeft: "none" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "28px" }}>
            flight_takeoff
          </span>
          <div>
            <div
              className="text-on-surface font-bold text-lg leading-none"
              style={{ fontFamily: "var(--font-sora), Sora, sans-serif" }}
            >
              SkyRoute
            </div>
            <div
              className="text-outline text-xs mt-0.5"
              style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}
            >
              Analytics v3
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ icon, label, tab }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all relative"
                style={{
                  background: isActive ? "rgba(208,188,255,0.1)" : "transparent",
                  color: isActive ? "#d0bcff" : "#958ea0",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: isActive ? 500 : 400,
                  borderLeft: isActive ? "3px solid #d0bcff" : "3px solid transparent",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "20px",
                    color: isActive ? "#d0bcff" : "#958ea0",
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  {icon}
                </span>
                {label}
                {isActive && (
                  <div
                    className="absolute right-3 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#d0bcff" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/[0.06] flex flex-col gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-outline hover:text-on-surface"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>settings</span>
            Pengaturan
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-outline hover:text-on-surface"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>help_outline</span>
            Bantuan
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-outline hover:text-on-surface"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>home</span>
            Beranda
          </button>
        </div>
      </aside>

      {/* ── Fixed Header ── */}
      <header
        className="fixed top-0 right-0 flex items-center justify-between px-6 glass-panel-solid"
        style={{ left: "280px", height: "64px", zIndex: 20, borderTop: "none", borderRight: "none" }}
      >
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-panel rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span
              className="text-on-surface-variant"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", letterSpacing: "0.05em" }}
            >
              Network Active — {airports.length} nodes
            </span>
          </div>
          {currentPath && (
            <div
              className="glass-panel rounded-full px-4 py-1.5 text-primary"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", letterSpacing: "0.03em" }}
            >
              {currentPath.path[0]} → {currentPath.path[currentPath.path.length - 1]} · {currentPath.total_distance.toFixed(0)} km
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-secondary" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}>
              <div className="w-1 h-1 rounded-full bg-secondary animate-ping" />
              Computing...
            </div>
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>notifications</span>
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-primary text-sm font-bold cursor-pointer"
            style={{ background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)", fontFamily: "Sora, sans-serif" }}
          >
            SR
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: "280px", marginTop: "64px", height: "calc(100vh - 64px)", position: "relative", zIndex: 10 }}
      >
        {/* Tab pills */}
        <div
          className="flex items-center gap-1 px-4 py-3 glass-panel shrink-0"
          style={{ borderLeft: "none", borderRight: "none", borderTop: "none" }}
        >
          {NAV_ITEMS.map(({ icon, label, tab }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: isActive ? "rgba(208,188,255,0.12)" : "transparent",
                  color: isActive ? "#d0bcff" : "#958ea0",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  fontWeight: isActive ? 500 : 400,
                  border: isActive ? "1px solid rgba(208,188,255,0.2)" : "1px solid transparent",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{icon}</span>
                {label}
              </button>
            );
          })}

          {error && (
            <div
              className="ml-auto text-error text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,180,171,0.1)", fontFamily: "JetBrains Mono, monospace" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Workspace area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "ROUTE_PLAN" && (
              <motion.div
                key="route"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex h-full overflow-hidden"
              >
                {/* Center Map Area */}
                <section className="flex flex-col flex-1 p-3 gap-3 overflow-hidden">
                  <div className="flex-1 glass-panel rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
                    <MapView
                      airports={airports}
                      graphEdges={graphEdges}
                      nfzZones={nfzZones}
                      activeRoute={currentPath as RouteResponse | null}
                      selectedOrigin={selectedOrigin}
                      selectedDest={selectedDest}
                      onSelectAirport={handleSelectAirport}
                      animationSteps={animationSteps}
                      isAnimating={isAnimating}
                      kShortestPaths={kPaths}
                    />

                    {/* Overlay info panel */}
                    <div
                      className="absolute top-3 left-3 glass-panel-solid rounded-xl p-3 z-[1000] w-52 pointer-events-none"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-outline text-xs">Network</span>
                        <span className="text-secondary text-xs">v3.44</span>
                      </div>
                      <div className="h-px w-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline">Nodes</span>
                        <span className="text-secondary">{airports.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-outline">Algorithm</span>
                        <span className="text-secondary">{selectedAlgo.toUpperCase()}</span>
                      </div>
                      {currentPath && (
                        <div className="mt-2 pt-2 flex justify-between items-center text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-outline">Explored</span>
                          <span className="text-primary">{currentPath.nodesExplored} nodes</span>
                        </div>
                      )}
                    </div>

                    {/* K-shortest legend */}
                    {kPaths.length > 1 && !isAnimating && (
                      <div
                        className="absolute bottom-3 left-3 glass-panel-solid rounded-xl p-2 z-[1000] pointer-events-none"
                        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}
                      >
                        <span className="text-outline mb-1 block">K-Shortest Paths</span>
                        {kPaths.map((kp, i) => (
                          <div key={i} className="flex items-center gap-2 mt-0.5">
                            <div
                              className="w-4 h-0.5 rounded"
                              style={{
                                background: i === 0 ? "#d0bcff" : i === 1 ? "#4cd7f6" : "#c4c1fb",
                                opacity: i === 0 ? 1 : 0.6,
                              }}
                            />
                            <span style={{ color: i === 0 ? "#d0bcff" : "#958ea0" }}>
                              {Math.round(kp.cost)} km
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* System Event Log */}
                  <div className="h-36 glass-panel rounded-xl flex flex-col overflow-hidden shrink-0">
                    <div className="flex items-center px-4 py-2 gap-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span
                        className="text-primary text-xs font-medium"
                        style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}
                      >
                        SYSTEM EVENT LOG
                      </span>
                      <span className="ml-auto text-outline text-xs" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        UTF-8 · Sector 7G
                      </span>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto" style={{ background: "rgba(15,13,21,0.6)" }}>
                      <ResultPanel
                        currentPath={currentPath}
                        isLoading={isLoading}
                        isRecalculating={isRecalculating}
                        logs={logs}
                      />
                    </div>
                  </div>
                </section>

                {/* Right Control Panel */}
                <aside
                  className="w-[320px] glass-panel flex flex-col p-5 overflow-y-auto shrink-0"
                  style={{ borderTop: "none", borderBottom: "none", borderRight: "none" }}
                >
                  <ControlPanel
                    airports={airports}
                    nfzZones={nfzZones}
                    selectedOrigin={selectedOrigin}
                    selectedDest={selectedDest}
                    selectedAlgo={selectedAlgo}
                    isLoading={isLoading}
                    animateExploration={animateExploration}
                    onSelectOrigin={setSelectedOrigin}
                    onSelectDest={setSelectedDest}
                    onSelectAlgo={setSelectedAlgo}
                    onToggleNfz={handleToggleNfz}
                    onFindRoute={handleFindRoute}
                    onToggleAnimate={setAnimateExploration}
                  />
                </aside>
              </motion.div>
            )}

            {activeTab === "FLEET_ALT" && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-1 h-full overflow-hidden"
              >
                <TelemetryWorkspace
                  currentPath={currentPath}
                  airports={airports}
                  graphEdges={graphEdges}
                  nfzZones={nfzZones}
                />
              </motion.div>
            )}

            {activeTab === "SYS_STATUS" && (
              <motion.div
                key="sys"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-1 h-full overflow-hidden"
              >
                <SysStatusWorkspace
                  airports={airports}
                  graphEdges={graphEdges}
                  nfzZones={nfzZones}
                  currentPath={currentPath}
                />
              </motion.div>
            )}

            {activeTab === "LOGS" && (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-1 h-full overflow-hidden"
              >
                <LogsWorkspace logs={logs} onClear={() => setLogs([])} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
