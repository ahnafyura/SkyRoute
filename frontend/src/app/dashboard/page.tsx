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
import { toggleNfz } from "@/lib/api";

import ControlPanel from "@/components/ControlPanel";
import ResultPanel from "@/components/ResultPanel";
import TelemetryWorkspace from "@/components/TelemetryWorkspace";
import SysStatusWorkspace from "@/components/SysStatusWorkspace";
import LogsWorkspace from "@/components/LogsWorkspace";
import SettingsModal from "@/components/SettingsModal";
import HelpModal from "@/components/HelpModal";
import ThemeToggle from "@/components/ThemeToggle";

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
        background: "var(--sky-bg)",
        color: "var(--sky-muted)",
        fontFamily: "monospace",
        fontSize: "12px",
        letterSpacing: "0.1em",
      }}
    >
      [SYSTEM] INITIALIZING_RADAR...
    </div>
  ),
});

type TabType = "ROUTE_PLAN" | "FLEET_ALT" | "SYS_STATUS" | "LOGS";

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();

  // ── Static graph data ──
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

  // ── Load graph + NFZ data on mount ──
  useEffect(() => {
    async function loadData() {
      try {
        const [gd, nfzRaw] = await Promise.all([
          fetch("/data/graph.json").then((r) => r.json() as Promise<GraphData>),
          fetch("/data/nfz.json").then((r) =>
            r.json() as Promise<{ nfz_zones: NfzZone[] }>
          ),
        ]);
        setAirports(gd.nodes);
        setGraphEdges(gd.edges);
        setGraphData(gd);
        setNfzZones(nfzRaw.nfz_zones);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load network data."
        );
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
  // Route calculation
  // ─────────────────────────────────────────────────────────────────────────

  const handleFindRoute = useCallback(async () => {
    if (!selectedOrigin || !selectedDest || !graphData) return;

    if (selectedOrigin === selectedDest) {
      const ts = new Date().toISOString().substring(11, 19);
      setLogs((p) => [
        ...p,
        `[${ts}] ERROR: Departure and destination cannot be identical.`,
      ]);
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
      const result = computeRoute({
        origin: selectedOrigin,
        destination: selectedDest,
        algo: selectedAlgo,
        graphData,
        nfzZones,
        trackSteps: animateExploration,
      });

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
        const kResults = yenKShortest(
          graphData.nodes,
          graphData.edges,
          masked,
          selectedOrigin,
          selectedDest,
          3
        );
        setKPaths(kResults);
      } catch {
        // K-shortest is non-critical
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Route calculation failed.";
      setError(msg);
      const ts2 = new Date().toISOString().substring(11, 19);
      setLogs((p) => [...p, `[${ts2}] ERROR: ${msg}`]);
      setCurrentPath(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedOrigin,
    selectedDest,
    selectedAlgo,
    graphData,
    nfzZones,
    airports.length,
    animateExploration,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // NFZ toggle — recalculate live route
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleNfz = useCallback(
    async (id: string, active: boolean) => {
      const updatedZones = nfzZones.map((z) =>
        z.id === id ? { ...z, active } : z
      );
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
          setLogs((p) => [
            ...p,
            `[${ts}] NFZ_RECALC: ${id} (${active ? "activated" : "deactivated"}) → ${newRoute.path.join(" → ")}`,
          ]);
          try {
            const { masked } = computeBlockedEdges(
              graphData.edges,
              graphData.nodes,
              updatedZones.filter((z) => z.active)
            );
            const kResults = yenKShortest(
              graphData.nodes,
              graphData.edges,
              masked,
              selectedOrigin,
              selectedDest,
              3
            );
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
  // Map click — select airports
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
  // Sidebar nav items
  // ─────────────────────────────────────────────────────────────────────────

  const NAV_ITEMS: { icon: string; label: string; tab: TabType }[] = [
    { icon: "📊", label: "SYS_STATUS", tab: "SYS_STATUS" },
    { icon: "🗺️", label: "ROUTE_PLAN", tab: "ROUTE_PLAN" },
    { icon: "✈️", label: "FLEET_ALT", tab: "FLEET_ALT" },
    { icon: "›_", label: "LOGS", tab: "LOGS" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in flex flex-col h-screen bg-sky-bg text-sky-muted font-mono overflow-hidden">
      {/* ── Settings & Help modals ── */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        defaultAlgo={selectedAlgo}
        onChangeAlgo={setSelectedAlgo}
        animateExploration={animateExploration}
        onChangeAnimate={setAnimateExploration}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-sky-border bg-sky-panel shrink-0">
        <div className="flex items-center gap-8">
          <div className="text-2xl font-black tracking-widest text-sky-accent drop-shadow-[0_0_8px_rgba(235,165,250,0.5)]">
            AERO_OS
          </div>
          <nav className="hidden md:flex gap-5 text-[11px] tracking-widest font-semibold">
            <span className="flex items-center gap-2 px-3 py-1 bg-sky-surface rounded text-sky-text border border-sky-border">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-cyan animate-pulse" />
              NETWORK: ACTIVE
            </span>
            <span
              onClick={() => router.push("/")}
              className="flex items-center gap-2 hover:text-sky-text cursor-pointer transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              HOME
            </span>
            {NAV_ITEMS.map(({ label, tab }) => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer transition-colors ${
                  activeTab === tab
                    ? "text-sky-accent border-b-2 border-sky-accent pb-1"
                    : "hover:text-sky-text"
                }`}
              >
                {label}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sky-muted">
          <ThemeToggle />
          <button
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 rounded-full border border-sky-border bg-sky-surface flex items-center justify-center cursor-pointer hover:border-sky-muted hover:text-sky-text transition-colors text-[11px] font-bold"
            title="Help"
          >
            ?
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-full border border-sky-border bg-sky-surface flex items-center justify-center cursor-pointer hover:border-sky-muted hover:text-sky-text transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="w-56 border-r border-sky-border bg-sky-panel flex flex-col justify-between py-5 shrink-0">
          <div>
            <h2 className="text-sky-accent text-xl font-bold px-5 tracking-widest drop-shadow-[0_0_4px_rgba(235,165,250,0.4)]">
              OPERATIONS
            </h2>
            <p className="text-[10px] text-sky-muted px-5 mt-0.5 tracking-[0.2em] mb-6">
              SECTOR_7G
            </p>
            <nav className="flex flex-col text-[11px] tracking-widest text-sky-muted">
              {NAV_ITEMS.map(({ icon, label, tab }) => (
                <motion.div
                  key={label}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 cursor-pointer flex items-center gap-3 transition-colors ${
                    activeTab === tab
                      ? "bg-sky-surface border-l-4 border-sky-accent text-sky-text"
                      : "hover:bg-sky-surface text-sky-muted"
                  }`}
                >
                  <span className="text-base opacity-70">{icon}</span>
                  {label}
                </motion.div>
              ))}
            </nav>
          </div>

          <div className="px-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFindRoute}
              disabled={!selectedOrigin || !selectedDest || isLoading}
              className="w-full py-2.5 bg-sky-accent text-white font-bold tracking-widest rounded text-[11px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              INIT_SEQUENCE
            </motion.button>
            <div className="mt-3 flex flex-col gap-2 text-[11px] tracking-widest text-sky-muted">
              <motion.span
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => setShowSettings(true)}
                className="cursor-pointer hover:text-sky-text transition-colors flex items-center gap-2"
              >
                ⚙️ SETTINGS
              </motion.span>
              <motion.span
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => setShowHelp(true)}
                className="cursor-pointer hover:text-sky-text transition-colors flex items-center gap-2"
              >
                ❓ HELP
              </motion.span>
            </div>
          </div>
        </aside>

        {/* ── Dynamic Workspace ── */}
        <AnimatePresence mode="wait">
          {activeTab === "ROUTE_PLAN" && (
            <motion.div
              key="route"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-1 overflow-hidden"
            >
              {/* Center Map Area */}
              <section className="flex flex-col flex-1 p-3 bg-sky-bg gap-3 overflow-hidden">
                <div
                  className="flex-1 border border-sky-border rounded-lg overflow-hidden relative"
                  style={{ minHeight: 0 }}
                >
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
                  <div className="absolute top-3 left-3 border border-sky-border bg-sky-panel/90 p-3 text-[10px] tracking-widest z-[1000] rounded w-56 shadow-xl pointer-events-none backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sky-muted">ACTIVE VECTOR</span>
                      <span className="text-sky-cyan">v3.44.0</span>
                    </div>
                    <div className="h-px w-full bg-sky-border mb-1.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-sky-muted">NODES</span>
                      <span className="text-sky-cyan">{airports.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sky-muted">ALGO</span>
                      <span className="text-sky-cyan">{selectedAlgo.toUpperCase()}</span>
                    </div>
                    {currentPath && (
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-sky-border">
                        <span className="text-sky-muted">EXPLORED</span>
                        <span className="text-sky-accent">{currentPath.nodesExplored} nodes</span>
                      </div>
                    )}
                  </div>

                  {/* K-Shortest legend */}
                  {kPaths.length > 1 && !isAnimating && (
                    <div className="absolute bottom-3 left-3 border border-sky-border bg-sky-panel/90 p-2 text-[9px] tracking-widest z-[1000] rounded shadow-xl pointer-events-none backdrop-blur-sm flex flex-col gap-1">
                      <span className="text-sky-muted">K-SHORTEST PATHS</span>
                      {kPaths.map((kp, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="w-4 h-0.5 rounded"
                            style={{
                              background:
                                i === 0
                                  ? "var(--sky-accent)"
                                  : i === 1
                                  ? "var(--sky-cyan)"
                                  : "#F97316",
                              opacity: i === 0 ? 1 : 0.5,
                            }}
                          />
                          <span className={i === 0 ? "text-sky-accent" : "text-sky-muted"}>
                            {Math.round(kp.cost)} km
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Event Log */}
                <div className="h-36 border border-sky-border bg-sky-panel rounded-lg flex flex-col overflow-hidden shrink-0">
                  <div className="flex items-center px-4 py-1.5 border-b border-sky-border gap-3 text-[10px] shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-accent animate-pulse" />
                    <span className="tracking-widest text-sky-accent font-bold border-b-2 border-sky-accent pb-0.5">
                      SYSTEM_EVENT_LOG
                    </span>
                    <span className="ml-auto text-sky-muted tracking-widest">
                      UTF-8 // SECTOR_7G
                    </span>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto bg-sky-bg">
                    <ResultPanel
                      currentPath={currentPath}
                      isLoading={isLoading}
                      isRecalculating={isRecalculating}
                      logs={logs}
                    />
                  </div>
                </div>
              </section>

              {/* Right Sidebar */}
              <aside className="w-[320px] border-l border-sky-border bg-sky-panel flex flex-col p-5 overflow-y-auto shrink-0">
                {error && (
                  <div className="bg-red-950/30 border border-red-500/40 text-red-400 px-3 py-2 rounded text-[10px] tracking-widest mb-5 break-words">
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
              className="flex flex-1 overflow-hidden"
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
              className="flex flex-1 overflow-hidden"
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
              className="flex flex-1 overflow-hidden"
            >
              <LogsWorkspace logs={logs} onClear={() => setLogs([])} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
