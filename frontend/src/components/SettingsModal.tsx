"use client";

import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import type { AlgoType } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAlgo: AlgoType;
  onChangeAlgo: (algo: AlgoType) => void;
  animateExploration: boolean;
  onChangeAnimate: (val: boolean) => void;
}

const ALGOS: { value: AlgoType; label: string; desc: string }[] = [
  { value: "dijkstra", label: "DIJKSTRA", desc: "O((V+E)logV)" },
  { value: "astar", label: "A_STAR", desc: "Heuristic" },
  { value: "bidir", label: "BIDIR", desc: "Bidirectional" },
];

export default function SettingsModal({
  isOpen,
  onClose,
  defaultAlgo,
  onChangeAlgo,
  animateExploration,
  onChangeAnimate,
}: SettingsModalProps) {
  const { resolvedTheme, setTheme } = useTheme();

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-full max-w-md font-mono"
          >
            <div className="glass-panel-solid rounded-2xl p-6 shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] text-outline tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>SYSTEM</div>
                  <h2 className="text-xl font-bold text-on-surface" style={{ fontFamily: "var(--font-sora), Sora, sans-serif" }}>Pengaturan</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-outline hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-lg glass-panel text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {/* Theme */}
                <div>
                  <div className="text-xs text-primary font-semibold tracking-widest mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>DISPLAY</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant" style={{ fontFamily: "Inter, sans-serif" }}>Tema Warna</span>
                    <div className="glass-panel rounded-lg p-0.5 flex gap-0.5">
                      {(["light", "dark"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className="px-4 py-1.5 text-xs rounded-md transition-all"
                          style={resolvedTheme === t ? {
                            background: "rgba(208,188,255,0.15)",
                            color: "#d0bcff",
                            border: "1px solid rgba(208,188,255,0.2)",
                          } : {
                            color: "#958ea0",
                          }}
                        >
                          {t === "light" ? "Terang" : "Gelap"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Algorithm */}
                <div>
                  <div className="text-xs text-primary font-semibold tracking-widest mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>PATHFINDING</div>
                  <div className="text-sm text-on-surface-variant mb-2" style={{ fontFamily: "Inter, sans-serif" }}>Algoritma Default</div>
                  <div className="glass-panel rounded-xl p-0.5 flex gap-0.5">
                    {ALGOS.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => onChangeAlgo(value)}
                        className="flex-1 py-2 text-center rounded-lg transition-all leading-tight"
                        style={defaultAlgo === value ? {
                          background: "rgba(208,188,255,0.15)",
                          color: "#d0bcff",
                          border: "1px solid rgba(208,188,255,0.2)",
                        } : { color: "#958ea0" }}
                        title={desc}
                      >
                        <div className="text-[9px] tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
                        <div className="text-[8px] opacity-50 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant" style={{ fontFamily: "Inter, sans-serif" }}>Animasi Eksplorasi</span>
                  <div
                    onClick={() => onChangeAnimate(!animateExploration)}
                    className="w-10 h-5 rounded-full transition-all relative cursor-pointer"
                    style={{ background: animateExploration ? "#d0bcff" : "rgba(255,255,255,0.1)" }}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        animateExploration ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                <div className="flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all"
                    style={{
                      background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)",
                      color: "#3c0091",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Simpan & Tutup
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
