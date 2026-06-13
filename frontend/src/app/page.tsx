"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    serial: "SN: MAP-08X-VX",
    title: "STRATEGIC MAPPING",
    desc: "Multi-layered geospatial overlays with great-circle arc routing and airline-grade cartographic precision.",
    borderHover: "hover:border-sky-accent/50",
    iconColor: "text-sky-accent",
    iconBorder: "border-sky-accent/30",
    iconBg: "bg-sky-accent/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    serial: "SN: OPT-332-ZZ",
    title: "VECTOR OPTIMIZATION",
    desc: "Dijkstra, A*, and Bidirectional Dijkstra with Yen's K-Shortest Paths — all computed in-browser with step visualization.",
    borderHover: "hover:border-sky-cyan/50",
    iconColor: "text-sky-cyan",
    iconBorder: "border-sky-cyan/30",
    iconBg: "bg-sky-cyan/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    serial: "SN: TEL-774-K1",
    title: "FLEET TELEMETRY",
    desc: "High-bandwidth data stream processing with animated aircraft traversal along calculated routes.",
    borderHover: "hover:border-sky-accent/50",
    iconColor: "text-sky-accent",
    iconBorder: "border-sky-accent/30",
    iconBg: "bg-sky-accent/10",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-sky-bg text-sky-muted font-mono relative overflow-hidden flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <div className="w-[800px] h-[800px] bg-gradient-to-b from-sky-panel to-transparent rounded-full blur-3xl" />
      </div>

      {/* ── Navigation ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-sky-accent drop-shadow-[0_0_8px_rgba(235,165,250,0.4)]">
            Aero<span className="text-sky-text">Optix</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.2em] font-semibold text-sky-muted">
          <span className="text-sky-text border-b-2 border-sky-text pb-1 cursor-pointer">MAP</span>
          <span onClick={() => router.push("/dashboard?tab=ROUTE_PLAN")} className="hover:text-sky-text cursor-pointer transition-colors">ROUTE</span>
          <span onClick={() => router.push("/dashboard?tab=FLEET_ALT")} className="hover:text-sky-text cursor-pointer transition-colors">FLEET</span>
          <span className="hover:text-sky-text cursor-pointer transition-colors">TERMINAL</span>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="hidden md:block px-5 py-2 bg-sky-accent text-white text-[10px] font-bold tracking-widest rounded transition-opacity hover:opacity-90"
          >
            LAUNCH SYSTEM
          </motion.button>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 mt-8 md:mt-16">
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="border border-sky-border bg-sky-panel/60 rounded-full px-4 py-1.5 mb-7 flex items-center gap-2 backdrop-blur-sm"
        >
          <span className="text-[9px] tracking-widest text-sky-muted">
            STATUS: <span className="text-sky-text">SYSTEM NOMINAL</span>{" // TERMINAL "}
            <span className="text-sky-text">ALPHA-9</span>
          </span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-text via-sky-cyan to-sky-accent drop-shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center mb-7"
        >
          AEROOPTIX
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-2xl text-center text-sm text-sky-muted leading-relaxed mb-10"
        >
          Precision flight route optimization powered by Dijkstra, A*, and Bidirectional
          search algorithms on real Indonesian airport networks with No-Fly Zone constraints.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="px-8 py-4 bg-sky-accent text-white text-sm font-bold tracking-widest rounded transition-all hover:shadow-[0_0_25px_rgba(235,165,250,0.4)]"
          >
            ENTER SYSTEM
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard?tab=ROUTE_PLAN")}
            className="px-8 py-4 border border-sky-border hover:border-sky-muted bg-transparent text-sky-text text-sm font-bold tracking-widest rounded transition-all hover:bg-sky-panel/50"
          >
            VIEW MAP
          </motion.button>
        </motion.div>

        {/* ── Feature Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 max-w-5xl w-full">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`border border-sky-border bg-sky-panel/80 backdrop-blur rounded-xl p-6 relative overflow-hidden group ${f.borderHover} transition-colors`}
            >
              <div className="absolute top-4 right-4 text-[8px] text-sky-muted/60 tracking-widest">
                {f.serial}
              </div>
              <div
                className={`w-9 h-9 rounded border ${f.iconBorder} ${f.iconBg} flex items-center justify-center ${f.iconColor} mb-5`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-sky-text tracking-wider mb-3">
                {f.title}
              </h3>
              <p className="text-[11px] text-sky-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Globe Visualization Area ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mt-10 w-full max-w-5xl border border-sky-border bg-sky-panel rounded-xl overflow-hidden relative h-56 md:h-80 flex items-center justify-center mb-10"
        >
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-cyan animate-pulse" />
            <span className="text-[9px] text-sky-muted tracking-widest">
              LIVE FEED // INDONESIAN AIRSPACE
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 md:w-80 md:h-80 border border-sky-border/40 rounded-full opacity-40 relative flex items-center justify-center animate-[spin_60s_linear_infinite]">
              <div className="absolute inset-0 border border-sky-cyan/20 rounded-full scale-[0.80]" />
              <div className="absolute inset-0 border border-sky-cyan/10 rounded-full scale-[0.60]" />
              <div className="absolute inset-0 border border-sky-cyan/5 rounded-full scale-[0.40]" />
              <div className="absolute w-full h-[1px] bg-sky-cyan/10 top-1/2" />
              <div className="absolute h-full w-[1px] bg-sky-cyan/10 left-1/2" />
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-3">
            {[["WIND SPEED", "42 KTS"], ["VISIBILITY", "MAX"]].map(([k, v]) => (
              <div key={k} className="border border-sky-border bg-sky-bg px-3 py-1 text-center">
                <div className="text-[7px] text-sky-muted tracking-widest">{k}</div>
                <div className="text-[11px] text-sky-text font-bold">{v}</div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 text-[9px] text-sky-muted tracking-widest">
            COMPUTING NEXT VECTOR... [99%]
          </div>
          <div className="absolute bottom-4 right-4 w-24 h-1 bg-sky-border rounded">
            <div className="w-[99%] h-full bg-sky-accent rounded" />
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-sky-border py-5 px-8 flex flex-col md:flex-row justify-between items-center bg-sky-panel z-10 text-[9px] text-sky-muted tracking-widest gap-3">
        <div>AEROOPTIX // STRATEGIC FLIGHT INTEL</div>
        <div className="flex gap-5">
          {["Security", "API", "Uptime", "Support"].map((l) => (
            <span key={l} className="hover:text-sky-text cursor-pointer transition-colors">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          SYSTEM ONLINE <span className="text-sky-muted/50 ml-1">0.02s</span>
        </div>
      </footer>
    </div>
  );
}
