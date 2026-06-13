export default function TelemetryWorkspace() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Center Area: Trajectory Wireframe ── */}
      <section className="flex flex-col flex-1 p-4 gap-4 bg-[#0a090c]">
        {/* Main large panel */}
        <div className="flex-1 border border-[#2d2a35] bg-[#1a1820] rounded-lg relative flex flex-col justify-between overflow-hidden">
          {/* Top Header */}
          <div className="p-6 flex justify-between items-start">
            <div>
              <div className="inline-block px-2 py-1 border border-[#4c425f] text-[#a591c2] text-[10px] tracking-widest mb-2 bg-[#2d2a35]/30">
                LIVESTREAM_VECTOR_01
              </div>
              <h2 className="text-3xl font-bold tracking-widest text-zinc-200">
                TRAJECTORY_WIREFRAME
              </h2>
            </div>
            <div className="text-right text-[10px] text-cyan-500 font-mono tracking-widest leading-relaxed">
              <div>LAT: 51.5074° N</div>
              <div>LNG: 0.1278° W</div>
            </div>
          </div>

          {/* Central Grid/Wireframe visual placeholder */}
          <div className="absolute inset-0 top-24 bottom-32 flex flex-col items-center justify-evenly pointer-events-none opacity-20">
            {/* Dashed horizontal lines to simulate a grid or HUD */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-full border-t border-dashed border-cyan-500/50"
              ></div>
            ))}
          </div>

          {/* Bottom stats inside central panel */}
          <div className="p-6 flex justify-between items-end border-t border-[#2d2a35]/50 bg-gradient-to-t from-[#110f15] to-transparent z-10">
            <div className="flex gap-8 font-mono">
              <div>
                <div className="text-[10px] text-zinc-500 mb-1 tracking-widest">
                  PITCH
                </div>
                <div className="text-lg text-zinc-200">+2.4°</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1 tracking-widest">
                  ROLL
                </div>
                <div className="text-lg text-zinc-200">-0.1°</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1 tracking-widest">
                  YAW
                </div>
                <div className="text-lg text-zinc-200">356°</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#EBA5FA] animate-pulse"></div>
              <div className="text-[10px] text-zinc-500 tracking-widest">
                SIGNAL_STRONG
              </div>
              <div className="w-24 h-1.5 bg-zinc-800 rounded overflow-hidden">
                <div className="w-4/5 h-full bg-[#EBA5FA]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom equalizer strip */}
        <div className="h-24 border border-[#2d2a35] bg-[#1a1820] rounded-lg p-4 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-cyan-500 tracking-widest mb-1">
              FL_OPTIMAL
            </div>
            <div className="text-xl text-zinc-600 font-mono">FL390</div>
          </div>

          {/* Stylized Equalizer */}
          <div className="flex items-end gap-1 h-full py-2">
            {[3, 5, 4, 7, 9, 10, 12, 8, 6, 4, 3, 2, 1].map((val, i) => (
              <div
                key={i}
                className="w-1.5 bg-[#EBA5FA] transition-all"
                style={{
                  height: `${(val / 12) * 100}%`,
                  opacity: 0.3 + (val / 12) * 0.7,
                }}
              ></div>
            ))}
          </div>

          <div className="text-right">
            <div className="text-[10px] text-zinc-500 tracking-widest mb-1">
              V_SPEED
            </div>
            <div className="text-lg text-zinc-300 font-mono">+450 FT/MIN</div>
          </div>
        </div>
      </section>

      {/* ── Right-Side Analytics Panel ── */}
      <aside className="w-[340px] border-l border-[#2d2a35] bg-[#1a1820] flex flex-col p-6 gap-6 overflow-y-auto">
        {/* Altitude Card */}
        <div className="border border-[#2d2a35] bg-[#110f15] rounded-lg p-4 relative">
          <div className="absolute top-4 right-4 text-[9px] text-zinc-600 font-mono tracking-widest">
            ID: ALT_TX_094
          </div>
          <div className="text-[10px] text-cyan-500 tracking-widest mb-2">
            ALTITUDE_MSL
          </div>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black text-cyan-400 tracking-tight">
              FL380
            </span>
            <span className="text-xs text-zinc-500 tracking-widest">CRUISE</span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-zinc-500 tracking-widest mb-1">
                TARGET
              </div>
              <div className="text-sm text-zinc-300 font-mono">FL410</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 tracking-widest mb-1">
                DEVIATION
              </div>
              <div className="text-sm text-red-400 font-mono">-0.02%</div>
            </div>
          </div>
        </div>

        {/* Small metrics row */}
        <div className="flex gap-4">
          <div className="flex-1 border border-[#2d2a35] bg-[#110f15] rounded-lg p-4">
            <div className="text-[10px] text-zinc-500 tracking-widest mb-2">
              DISTANCE
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl text-zinc-300 font-mono">1,240</span>
              <span className="text-[9px] text-zinc-600 tracking-widest">NM</span>
            </div>
            <div className="mt-3 w-full h-1 bg-zinc-800 rounded">
              <div className="w-2/3 h-full bg-cyan-500 rounded"></div>
            </div>
          </div>
          <div className="flex-1 border border-[#2d2a35] bg-[#110f15] rounded-lg p-4">
            <div className="text-[10px] text-zinc-500 tracking-widest mb-2">
              FUEL
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl text-zinc-300 font-mono">42.5</span>
              <span className="text-[9px] text-zinc-600 tracking-widest">T</span>
            </div>
            <div className="mt-3 w-full h-1 bg-zinc-800 rounded">
              <div className="w-[42%] h-full bg-red-500 rounded"></div>
            </div>
          </div>
        </div>

        {/* Fleet Sync Status Card */}
        <div className="border border-[#2d2a35] bg-[#110f15] rounded-lg p-6 flex flex-col items-center relative overflow-hidden">
          <div className="text-[10px] text-zinc-400 tracking-widest mb-6 border-b border-[#2d2a35] w-full text-center pb-2">
            FLEET_SYNC_STATUS
          </div>

          <div className="w-32 h-32 rounded-xl border border-[#4c425f] bg-[#1a1820] flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(235,165,250,0.1)] mb-6">
            <div className="text-3xl font-bold text-[#EBA5FA] mb-1">98%</div>
            <div className="text-[8px] text-[#a591c2] tracking-widest">
              UPLINKED
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 text-xs font-mono">
            <div className="flex justify-between items-center border-l-2 border-cyan-500 pl-2">
              <span className="text-zinc-400">OBJ_742_X</span>
              <span className="text-cyan-500 tracking-widest text-[10px]">
                STABLE
              </span>
            </div>
            <div className="flex justify-between items-center border-l-2 border-[#EBA5FA] pl-2">
              <span className="text-zinc-400">OBJ_210_Y</span>
              <span className="text-[#EBA5FA] tracking-widest text-[10px]">
                ASCENDING
              </span>
            </div>
          </div>
        </div>

        <button className="mt-auto w-full py-4 bg-[#c822ff] hover:bg-[#d652ff] text-white font-bold tracking-widest rounded transition-colors text-sm shadow-[0_0_20px_rgba(200,34,255,0.4)]">
          FILE FLIGHT PLAN
        </button>
      </aside>
    </div>
  );
}
