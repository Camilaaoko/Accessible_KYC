"use client";

import React from "react";
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  Eye,
  Sparkles,
  Layers,
  Camera,
} from "lucide-react";

interface HeaderProps {
  activeTab: "splitscreen" | "eyesclosed" | "onboarding";
  setActiveTab: (tab: "splitscreen" | "eyesclosed" | "onboarding") => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  audioMuted: boolean;
  setAudioMuted: (val: boolean) => void;
  backendOnline: boolean;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  highContrast,
  setHighContrast,
  audioMuted,
  setAudioMuted,
  backendOnline,
  cameraActive,
  onToggleCamera,
}) => {
  return (
    <header
      className={`border-b transition-colors px-4 py-3 md:px-8 ${
        highContrast
          ? "bg-black border-yellow-400 text-yellow-400"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Mission Tagline */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              highContrast
                ? "bg-yellow-400 text-black"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            }`}
          >
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                Accessible<span className={highContrast ? "text-yellow-300" : "text-emerald-400"}>KYC</span>
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium border border-emerald-500/30 text-emerald-400 bg-emerald-950/40">
                WCAG AAA
              </span>
            </div>
            <p className="text-xs opacity-80">
              Tremor Motion Dampener • Sensory Haptic Radar • Zero Gymnastics
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("splitscreen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === "splitscreen"
                ? highContrast
                  ? "bg-yellow-400 text-black font-bold"
                  : "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            Split-Screen Comparison
          </button>

          <button
            onClick={() => setActiveTab("eyesclosed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === "eyesclosed"
                ? highContrast
                  ? "bg-yellow-400 text-black font-bold"
                  : "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Eye className="w-4 h-4" />
            Eyes-Closed Radar
          </button>

          <button
            onClick={() => setActiveTab("onboarding")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === "onboarding"
                ? highContrast
                  ? "bg-yellow-400 text-black font-bold"
                  : "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Complete Verification
          </button>
        </nav>

        {/* Action Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Prominent Green "Enable Webcam" button / Camera Active badge */}
          {cameraActive ? (
            <button
              onClick={onToggleCamera}
              title="Click to turn camera off"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-semibold transition-all hover:bg-emerald-500/25"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>● Camera Active</span>
            </button>
          ) : (
            <button
              onClick={onToggleCamera}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Webcam</span>
            </button>
          )}

          {/* Audio Radar Toggle */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            title={audioMuted ? "Enable Audio Pitch Guidance" : "Mute Audio Guidance"}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              audioMuted
                ? "border-slate-700 text-slate-400 hover:border-slate-500"
                : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast Mode (WCAG AAA)"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              highContrast
                ? "bg-yellow-400 text-black border-yellow-300 font-bold"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            AAA Contrast
          </button>

          {/* Backend Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
              backendOnline
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-900 text-slate-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-slate-500"}`}
            />
            <span className="font-mono">{backendOnline ? "API 8000" : "Client Edge"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
