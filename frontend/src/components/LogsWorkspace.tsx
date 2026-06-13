"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface LogsWorkspaceProps {
  logs: string[];
  onClear: () => void;
}

type LogFilter = "ALL" | "TRAFFIC" | "PATH" | "NFZ" | "ERROR";

function logColor(log: string): string {
  if (log.includes("ERROR")) return "text-red-400";
  if (log.includes("PATH_RESOLVED")) return "text-sky-accent";
  if (log.includes("NFZ_RECALC")) return "text-orange-400";
  if (log.includes("VECTOR_CALC")) return "text-sky-cyan";
  if (log.includes("TRAFFIC_ADVISORY")) return "text-sky-text";
  return "text-sky-muted";
}

function matchFilter(log: string, filter: LogFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "TRAFFIC") return log.includes("TRAFFIC_ADVISORY");
  if (filter === "PATH") return log.includes("PATH_RESOLVED") || log.includes("VECTOR_CALC");
  if (filter === "NFZ") return log.includes("NFZ_RECALC");
  if (filter === "ERROR") return log.includes("ERROR");
  return true;
}

export default function LogsWorkspace({ logs, onClear }: LogsWorkspaceProps) {
  const [filter, setFilter] = useState<LogFilter>("ALL");
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filtered = logs.filter((l) => matchFilter(l, filter));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const FILTERS: { key: LogFilter; label: string }[] = [
    { key: "ALL", label: "ALL" },
    { key: "TRAFFIC", label: "TRAFFIC" },
    { key: "PATH", label: "PATH" },
    { key: "NFZ", label: "NFZ" },
    { key: "ERROR", label: "ERROR" },
  ];

  return (
    <div className="flex flex-1 overflow-hidden bg-sky-bg">
      <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sky-border pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-accent animate-pulse" />
            <span className="text-sky-accent font-bold tracking-widest text-[11px]">
              SYSTEM_EVENT_LOG
            </span>
            <span className="text-sky-muted text-[10px]">({logs.length} entries)</span>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              disabled={logs.length === 0}
              className="px-3 py-1 border border-sky-border text-sky-muted text-[10px] tracking-widest hover:text-sky-text hover:border-sky-muted disabled:opacity-40 transition-colors rounded"
            >
              {copied ? "COPIED ✓" : "COPY_ALL"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClear}
              disabled={logs.length === 0}
              className="px-3 py-1 border border-sky-border text-sky-muted text-[10px] tracking-widest hover:text-red-400 hover:border-red-400/40 disabled:opacity-40 transition-colors rounded"
            >
              CLEAR
            </motion.button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 shrink-0">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-[10px] tracking-widest border rounded transition-colors ${
                filter === key
                  ? "bg-sky-surface border-sky-accent text-sky-accent"
                  : "border-sky-border text-sky-muted hover:text-sky-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Log output */}
        <div className="flex-1 bg-sky-panel border border-sky-border rounded-lg overflow-y-auto p-4 font-mono text-[11px] leading-relaxed min-h-0">
          {filtered.length === 0 ? (
            <div className="text-sky-muted opacity-50 text-center py-10">
              {logs.length === 0 ? "AWAITING_EVENTS..." : "NO_MATCHING_ENTRIES"}
            </div>
          ) : (
            filtered.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.25) }}
                className={`${logColor(log)} py-0.5 border-b border-sky-border/20`}
              >
                <span className="text-sky-border mr-3 select-none font-mono">
                  {String(i + 1).padStart(4, "0")}
                </span>
                {log}
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Status bar */}
        <div className="shrink-0 flex items-center justify-between text-[10px] text-sky-muted tracking-widest">
          <span>SECTOR_7G // UTF-8 // LIVE</span>
          <span>
            {filtered.length} / {logs.length} shown
          </span>
        </div>
      </div>
    </div>
  );
}
