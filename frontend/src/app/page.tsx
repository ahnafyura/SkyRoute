"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a090c] text-zinc-300 font-mono relative overflow-hidden flex flex-col">
      {/* ── Background Aesthetics ── */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <div className="w-[800px] h-[800px] bg-gradient-to-b from-[#1a1820] to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* ── Navigation Bar ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          {/* Logo text */}
          <span className="text-2xl font-black tracking-tighter text-[#EBA5FA] drop-shadow-[0_0_8px_rgba(235,165,250,0.4)]">
            Aero<span className="text-zinc-200">Optix</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.2em] font-semibold text-zinc-500">
          <span className="text-zinc-200 border-b-2 border-zinc-200 pb-1 cursor-pointer transition-colors">MAP</span>
          <span 
            onClick={() => router.push("/dashboard?tab=ROUTE_PLAN")}
            className="hover:text-zinc-300 cursor-pointer transition-colors"
          >
            ROUTE
          </span>
          <span 
            onClick={() => router.push("/dashboard?tab=FLEET_ALT")}
            className="hover:text-zinc-300 cursor-pointer transition-colors"
          >
            FLEET
          </span>
          <span className="hover:text-zinc-300 cursor-pointer transition-colors">TERMINAL</span>
        </nav>

        <button 
          onClick={() => router.push("/dashboard")}
          className="hidden md:block px-6 py-2 bg-[#EBA5FA] text-[#0a090c] text-[10px] font-bold tracking-widest rounded transition-transform hover:scale-105"
        >
          LAUNCH SYSTEM
        </button>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 mt-12 md:mt-24">
        
        {/* Status Pill */}
        <div className="border border-zinc-800 bg-zinc-900/50 rounded-full px-4 py-1.5 mb-8 flex items-center gap-2 backdrop-blur-sm">
          <span className="text-[9px] tracking-widest text-zinc-400">
            STATUS: <span className="text-zinc-300">SYSTEM NOMINAL</span> // TERMINAL <span className="text-zinc-300">ALPHA-9</span>
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-6xl md:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-cyan-100 to-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] text-center mb-8">
          AEROOPTIX
        </h1>

        {/* Subheader */}
        <p className="max-w-2xl text-center text-sm md:text-base text-zinc-400 leading-relaxed font-mono mb-12">
          Precision Flight Route Optimization powered by real-time telemetry and vector-based tactical forecasting. Engineer the sky.
        </p>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-8 py-4 bg-[#EBA5FA] text-[#0a090c] hover:bg-[#f1bcfd] text-sm font-bold tracking-widest rounded transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(235,165,250,0.5)]"
          >
            ENTER SYSTEM
          </button>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 bg-transparent text-zinc-300 text-sm font-bold tracking-widest rounded transition-all hover:bg-zinc-800/50"
          >
            DOCUMENTATION
          </button>
        </div>

        {/* ── Feature Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full">
          {/* Card 1 */}
          <div className="border border-[#2d2a35] bg-[#110f15]/80 backdrop-blur rounded-xl p-6 relative overflow-hidden group hover:border-[#EBA5FA]/50 transition-colors">
            <div className="absolute top-4 right-4 text-[8px] text-zinc-600 tracking-widest">SN: MAP-08X-VX</div>
            <div className="w-10 h-10 rounded border border-[#EBA5FA]/30 bg-[#EBA5FA]/10 flex items-center justify-center text-[#EBA5FA] mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-200 tracking-wider mb-4">STRATEGIC MAPPING</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">Multi-layered geospatial overlays with real-time atmospheric data injection for precise navigation.</p>
          </div>

          {/* Card 2 */}
          <div className="border border-[#2d2a35] bg-[#110f15]/80 backdrop-blur rounded-xl p-6 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
            <div className="absolute top-4 right-4 text-[8px] text-zinc-600 tracking-widest">SN: OPT-332-ZZ</div>
            <div className="w-10 h-10 rounded border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-200 tracking-wider mb-4">VECTOR OPTIMIZATION</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">Proprietary pathfinding algorithms designed to minimize drag and energy expenditure across trans-global routes.</p>
          </div>

          {/* Card 3 */}
          <div className="border border-[#2d2a35] bg-[#110f15]/80 backdrop-blur rounded-xl p-6 relative overflow-hidden group hover:border-[#EBA5FA]/50 transition-colors">
            <div className="absolute top-4 right-4 text-[8px] text-zinc-600 tracking-widest">SN: TEL-774-K1</div>
            <div className="w-10 h-10 rounded border border-[#EBA5FA]/30 bg-[#EBA5FA]/10 flex items-center justify-center text-[#EBA5FA] mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-200 tracking-wider mb-4">FLEET TELEMETRY</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">High-bandwidth data stream processing providing sub-millisecond visibility into every asset in your fleet.</p>
          </div>
        </div>

        {/* ── Bottom Globe Visualization Area ── */}
        <div className="mt-12 w-full max-w-5xl border border-[#2d2a35] bg-[#110f15] rounded-xl overflow-hidden relative h-64 md:h-96 flex items-center justify-center mb-12">
           <div className="absolute top-4 left-4 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
             <span className="text-[9px] text-zinc-500 tracking-widest">LIVE FEED // NORTH ATLANTIC</span>
             <span className="text-[9px] text-zinc-600 ml-2">LAT: 40.7128° N | LON: 74.0060° W</span>
           </div>
           
           {/* Static/CSS placeholder for the globe map to match aesthetic */}
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-[#110f15] to-[#110f15] flex items-center justify-center">
             {/* A CSS mesh/grid simulating the globe wireframe */}
             <div className="w-64 h-64 md:w-96 md:h-96 border border-[#2d2a35]/50 rounded-full opacity-40 relative flex items-center justify-center animate-[spin_60s_linear_infinite]">
                <div className="absolute inset-0 border border-cyan-500/20 rounded-full scale-[0.80]"></div>
                <div className="absolute inset-0 border border-cyan-500/10 rounded-full scale-[0.60]"></div>
                <div className="absolute inset-0 border border-cyan-500/5 rounded-full scale-[0.40]"></div>
                <div className="absolute w-full h-[1px] bg-cyan-500/10 top-1/2"></div>
                <div className="absolute h-full w-[1px] bg-cyan-500/10 left-1/2"></div>
             </div>
           </div>

           {/* Metrics Overlay inside Globe Box */}
           <div className="absolute top-4 right-4 flex gap-4">
             <div className="border border-[#2d2a35] bg-[#0a090c] px-3 py-1 text-center">
               <div className="text-[7px] text-zinc-600 tracking-widest">WIND SPEED</div>
               <div className="text-xs text-zinc-300 font-bold">42 KTS</div>
             </div>
             <div className="border border-[#2d2a35] bg-[#0a090c] px-3 py-1 text-center">
               <div className="text-[7px] text-zinc-600 tracking-widest">VISIBILITY</div>
               <div className="text-xs text-zinc-300 font-bold">MAX</div>
             </div>
           </div>

           <div className="absolute bottom-4 left-4 text-[9px] text-zinc-600 tracking-widest">
             COMPUTING NEXT VECTOR... [99%]
           </div>
           <div className="absolute bottom-4 right-4 w-24 h-1 bg-zinc-800 rounded">
             <div className="w-[99%] h-full bg-[#EBA5FA] rounded"></div>
           </div>
        </div>
      </main>

      {/* ── Footer Bar ── */}
      <footer className="border-t border-[#2d2a35] py-6 px-8 flex flex-col md:flex-row justify-between items-center bg-[#0a090c] z-10 text-[9px] text-zinc-600 tracking-widest gap-4">
         <div>AEROOPTIX // STRATEGIC FLIGHT INTEL</div>
         <div className="flex gap-6">
           <span className="hover:text-zinc-400 cursor-pointer transition-colors">Security</span>
           <span className="hover:text-zinc-400 cursor-pointer transition-colors">API</span>
           <span className="hover:text-zinc-400 cursor-pointer transition-colors">Uptime</span>
           <span className="hover:text-zinc-400 cursor-pointer transition-colors">Support</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></div>
           SYSTEM ONLINE <span className="text-zinc-700 ml-1">0.02s</span>
         </div>
      </footer>
    </div>
  );
}
