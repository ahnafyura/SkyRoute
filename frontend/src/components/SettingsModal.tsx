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
            <div className="bg-sky-panel border border-sky-border rounded-xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] text-sky-muted tracking-widest">SYSTEM</div>
                  <h2 className="text-xl font-bold tracking-widest text-sky-text">SETTINGS</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-sky-muted hover:text-sky-text transition-colors w-7 h-7 flex items-center justify-center rounded border border-sky-border hover:border-sky-muted text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {/* Theme */}
                <div>
                  <div className="text-[10px] text-sky-accent font-bold tracking-widest mb-3">DISPLAY</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-sky-muted tracking-widest">COLOR THEME</span>
                    <div className="bg-sky-bg border border-sky-border rounded p-0.5 flex gap-0.5">
                      {(["light", "dark"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`px-4 py-1.5 text-[10px] tracking-widest rounded transition-colors ${
                            resolvedTheme === t
                              ? "bg-sky-surface text-sky-text border border-sky-border"
                              : "text-sky-muted hover:text-sky-text"
                          }`}
                        >
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-sky-border" />

                {/* Algorithm */}
                <div>
                  <div className="text-[10px] text-sky-accent font-bold tracking-widest mb-3">PATHFINDING</div>
                  <div className="text-[11px] text-sky-muted tracking-widest mb-2">DEFAULT ALGORITHM</div>
                  <div className="bg-sky-bg border border-sky-border rounded p-0.5 flex gap-0.5">
                    {ALGOS.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => onChangeAlgo(value)}
                        className={`flex-1 py-2 text-center rounded transition-colors leading-tight ${
                          defaultAlgo === value
                            ? "bg-sky-surface text-sky-text border border-sky-border"
                            : "text-sky-muted hover:text-sky-text"
                        }`}
                        title={desc}
                      >
                        <div className="text-[9px] tracking-widest">{label}</div>
                        <div className="text-[8px] opacity-50 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-sky-muted tracking-widest">ANIMATE EXPLORATION</span>
                  <div
                    onClick={() => onChangeAnimate(!animateExploration)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      animateExploration ? "bg-sky-accent" : "bg-sky-border"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        animateExploration ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>

                <div className="h-px bg-sky-border" />

                <div className="flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="px-6 py-2 bg-sky-accent text-white text-[11px] font-bold tracking-widest rounded hover:opacity-90 transition-opacity"
                  >
                    APPLY & CLOSE
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
