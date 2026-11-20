"use client";

import React from "react";
import { Sliders, RefreshCw, Zap } from "lucide-react";

interface TremorControlsProps {
  highContrast: boolean;
  tremorEnabled: boolean;
  setTremorEnabled: (val: boolean) => void;
  tremorFreq: number;
  setTremorFreq: (val: number) => void;
  tremorAmp: number;
  setTremorAmp: (val: number) => void;
  kalmanQ: number;
  setKalmanQ: (val: number) => void;
  kalmanR: number;
  setKalmanR: (val: number) => void;
  onReset: () => void;
  jitterReductionPct?: number;
}

export const TremorControls: React.FC<TremorControlsProps> = ({
  highContrast,
  tremorEnabled,
  setTremorEnabled,
  tremorFreq,
  setTremorFreq,
  tremorAmp,
  setTremorAmp,
  kalmanQ,
  setKalmanQ,
  kalmanR,
  setKalmanR,
  onReset,
  jitterReductionPct = 84.5,
}) => {
  const setPreset = (type: "subtle" | "parkinsons" | "calm") => {
    if (type === "parkinsons") {
      setTremorEnabled(true);
      setTremorFreq(5.5);
      setTremorAmp(0.08); // 8%
      setKalmanQ(0.005);
      setKalmanR(0.05);
    } else if (type === "subtle") {
      setTremorEnabled(true);
      setTremorFreq(6.0);
      setTremorAmp(0.015); // 1.5%
      setKalmanQ(0.005);
      setKalmanR(0.04);
    } else {
      setTremorEnabled(false);
      setTremorAmp(0.0);
      setTremorFreq(4.0);
    }
  };

  // Format amplitude as percentage 1% - 8%
  const ampPercentage = Math.max(0, Math.min(8, Math.round((tremorAmp / 0.08) * 8 * 10) / 10));

  return (
    <div
      className={`rounded-2xl border p-4 ${
        highContrast
          ? "bg-black border-yellow-400 text-yellow-300"
          : "bg-slate-900/90 border-slate-800 text-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Adaptive Tremor &amp; Filter Toolbar</h3>
        </div>

        {/* Live Jitter Reduction Telemetry Meter */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-slate-400">Jitter Reduction Telemetry:</span>
          <span className="font-mono text-xs font-bold text-cyan-300">
            {tremorEnabled ? `${jitterReductionPct.toFixed(1)}%` : "N/A (Calm)"}
          </span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setPreset("subtle")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
            tremorEnabled && tremorAmp <= 0.03
              ? highContrast
                ? "bg-yellow-400 text-black font-bold border-yellow-300"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
          }`}
        >
          Subtle Tremor (1%–2%)
        </button>

        <button
          onClick={() => setPreset("parkinsons")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
            tremorEnabled && tremorAmp > 0.03
              ? highContrast
                ? "bg-yellow-400 text-black font-bold border-yellow-300"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
          }`}
        >
          Parkinson&apos;s Tremor (8%)
        </button>

        <button
          onClick={() => setPreset("calm")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
            !tremorEnabled
              ? highContrast
                ? "bg-yellow-400 text-black font-bold border-yellow-300"
                : "bg-slate-800 text-slate-100 border-slate-600"
              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
          }`}
        >
          Calm Hand (0%)
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400 font-medium">Inject Tremor Noise:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {tremorEnabled ? `${ampPercentage.toFixed(1)}% Jitter` : "0% (Disabled)"}
            </span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.08"
            step="0.005"
            value={tremorAmp}
            onChange={(e) => {
              setTremorAmp(parseFloat(e.target.value));
              setTremorEnabled(true);
            }}
            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400 font-medium">Tremor Frequency (Hz):</span>
            <span className="font-mono text-emerald-400 font-semibold">{tremorFreq.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min="3.0"
            max="10.0"
            step="0.5"
            value={tremorFreq}
            onChange={(e) => {
              setTremorFreq(parseFloat(e.target.value));
              setTremorEnabled(true);
            }}
            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Kalman Process Noise (Q):</span>
            <span className="font-mono text-cyan-400 font-semibold">{kalmanQ.toFixed(4)}</span>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={kalmanQ}
            onChange={(e) => setKalmanQ(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Kalman Measurement Noise (R):</span>
              <span className="font-mono text-cyan-400 font-semibold">{kalmanR.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={kalmanR}
              onChange={(e) => setKalmanR(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={onReset}
            className="p-2 rounded-lg text-xs border border-slate-700 bg-slate-950 hover:bg-slate-800 flex items-center gap-1 transition-colors text-slate-300 shrink-0"
            title="Reset to defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
