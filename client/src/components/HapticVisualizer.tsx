"use client";

import React, { useEffect, useState } from "react";
import { Smartphone, Zap } from "lucide-react";
import { hapticRadarService, HapticStateDetail } from "../lib/haptics";

interface HapticVisualizerProps {
  highContrast: boolean;
}

export const HapticVisualizer: React.FC<HapticVisualizerProps> = ({ highContrast }) => {
  const [hapticState, setHapticState] = useState<HapticStateDetail>({
    pattern: "heartbeat",
    intervalMs: 1200,
    intensity: 0.4,
    label: "Searching for Face (Heartbeat)",
  });
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const unsubscribe = hapticRadarService.subscribe((detail) => {
      setHapticState(detail);
      setPulsing(true);
      setTimeout(() => setPulsing(false), 220);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className={`rounded-xl border p-3 flex items-center justify-between gap-3 text-xs ${
        highContrast
          ? "bg-black border-yellow-400 text-yellow-300"
          : "bg-slate-900/80 border-slate-800 text-slate-300"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`relative p-2 rounded-lg transition-transform ${
            pulsing ? "scale-110" : "scale-100"
          } ${
            highContrast
              ? "bg-yellow-400 text-black"
              : hapticState.pattern === "double_tap"
              ? "bg-emerald-500 text-slate-950 animate-bounce"
              : hapticState.pattern === "geiger_rapid"
              ? "bg-cyan-500 text-slate-950"
              : "bg-slate-800 text-emerald-400"
          }`}
        >
          <Smartphone className="w-5 h-5" />
          {pulsing && (
            <span
              className={`absolute -inset-1 rounded-lg border-2 animate-ping pointer-events-none ${
                highContrast ? "border-yellow-400" : "border-emerald-400"
              }`}
            />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-semibold">
            <span>Tactile Haptic Radar</span>
            <span
              className={`px-1.5 py-0.2 rounded font-mono text-[10px] uppercase ${
                hapticState.pattern === "double_tap"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : hapticState.pattern === "geiger_rapid"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {hapticState.pattern}
            </span>
          </div>
          <p className="text-[11px] opacity-75">
            {hapticState.label} • Pulse: {hapticState.intervalMs}ms
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 font-mono text-[11px]">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>Intensity: {Math.round(hapticState.intensity * 100)}%</span>
      </div>
    </div>
  );
};
