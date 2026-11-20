"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";
import { SplitScreenDemo } from "../components/SplitScreenDemo";
import { EyesClosedChallenge } from "../components/EyesClosedChallenge";
import { SingleVerificationFlow } from "../components/SingleVerificationFlow";
import { TremorControls } from "../components/TremorControls";
import { HapticVisualizer } from "../components/HapticVisualizer";
import { checkBackendHealth } from "../lib/api";
import { audioRadarInstance } from "../lib/audioRadar";
import { Users, Activity, ShieldCheck } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"splitscreen" | "eyesclosed" | "onboarding">("splitscreen");
  const [highContrast, setHighContrast] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Webcam state
  const [cameraActive, setCameraActive] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Tremor & Kalman Controls
  const [tremorEnabled, setTremorEnabled] = useState(true);
  const [tremorFreq, setTremorFreq] = useState(5.5);
  const [tremorAmp, setTremorAmp] = useState(0.04);
  const [kalmanQ, setKalmanQ] = useState(0.005);
  const [kalmanR, setKalmanR] = useState(0.05);
  const [jitterReductionPct, setJitterReductionPct] = useState(84.5);

  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, []);

  // Poll backend health check on mount
  useEffect(() => {
    checkBackendHealth().then((res) => setBackendOnline(res.online));
    const interval = setInterval(() => {
      checkBackendHealth().then((res) => setBackendOnline(res.online));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Webcam
  const handleToggleCamera = async () => {
    if (cameraActive) {
      // Turn off
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      audioRadarInstance.speakGuidance("Camera turned off.");
    } else {
      // Request webcam access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          audioRadarInstance.speakGuidance("Camera active. Align face in frame.");
        }
      } catch (err) {
        console.error("Camera permission error:", err);
        alert(
          "Webcam access was not granted or is unavailable on this device. Please allow camera permissions in your browser bar."
        );
      }
    }
  };

  const handleResetControls = () => {
    setTremorEnabled(true);
    setTremorFreq(5.5);
    setTremorAmp(0.04);
    setKalmanQ(0.005);
    setKalmanR(0.05);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        highContrast ? "bg-black text-yellow-400" : "bg-slate-950 text-slate-100"
      }`}
    >
      {/* Hidden HTML Video element streaming user webcam */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
        style={{ display: "none" }}
      />

      {/* Top Accessible Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        backendOnline={backendOnline}
        cameraActive={cameraActive}
        onToggleCamera={handleToggleCamera}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Real-time Tactile Haptic Bar */}
        <HapticVisualizer highContrast={highContrast} />

        {/* Tab 1: Split-Screen Comparison Demo */}
        {activeTab === "splitscreen" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>Split-Screen Tremor Verification Challenge</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    Live Split Demo
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Witness how standard commercial KYC fails users with motor tremors, while AccessibleKYC smooths coordinates in real time.
                </p>
              </div>
            </div>

            <SplitScreenDemo
              highContrast={highContrast}
              tremorEnabled={tremorEnabled}
              tremorFreq={tremorFreq}
              tremorAmp={tremorAmp}
              kalmanQ={kalmanQ}
              kalmanR={kalmanR}
              audioMuted={audioMuted}
              cameraActive={cameraActive}
              onEnableCamera={handleToggleCamera}
              videoElement={videoElement}
              onUpdateJitterReduction={setJitterReductionPct}
            />

            {/* Tremor Simulation Controller */}
            <TremorControls
              highContrast={highContrast}
              tremorEnabled={tremorEnabled}
              setTremorEnabled={setTremorEnabled}
              tremorFreq={tremorFreq}
              setTremorFreq={setTremorFreq}
              tremorAmp={tremorAmp}
              setTremorAmp={setTremorAmp}
              kalmanQ={kalmanQ}
              setKalmanQ={setKalmanQ}
              kalmanR={kalmanR}
              setKalmanR={setKalmanR}
              onReset={handleResetControls}
              jitterReductionPct={jitterReductionPct}
            />
          </div>
        )}

        {/* Tab 2: Eyes-Closed Tactile Radar Challenge */}
        {activeTab === "eyesclosed" && (
          <div className="space-y-6 animate-fade-in">
            <EyesClosedChallenge
              highContrast={highContrast}
              audioMuted={audioMuted}
              cameraActive={cameraActive}
              onEnableCamera={handleToggleCamera}
              videoElement={videoElement}
            />
          </div>
        )}

        {/* Tab 3: Complete 3-Step Verification Onboarding Flow */}
        {activeTab === "onboarding" && (
          <div className="space-y-6 animate-fade-in">
            <SingleVerificationFlow highContrast={highContrast} audioMuted={audioMuted} />
          </div>
        )}

        {/* Impact & Inclusion Metric Highlights */}
        <section className="pt-8 border-t border-slate-800/80">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Universal Impact &amp; Regulatory Compliance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div
              className={`p-4 rounded-2xl border ${
                highContrast
                  ? "border-yellow-400 bg-black text-yellow-300"
                  : "border-slate-800 bg-slate-900/40 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-100">1.3 Billion People</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Worldwide living with significant disabilities who face systematic barriers when opening remote bank accounts or onboarding into remote work.
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                highContrast
                  ? "border-yellow-400 bg-black text-yellow-300"
                  : "border-slate-800 bg-slate-900/40 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-100">15% - 20% Drop-off Saved</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Smart Fallback SDK stops lost revenue for banks, gig platforms, and digital employers by recovering drop-offs caused by motor tremors or visual conditions.
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                highContrast
                  ? "border-yellow-400 bg-black text-yellow-300"
                  : "border-slate-800 bg-slate-900/40 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-slate-100">EAA &amp; ADA Compliance</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Full compliance with the European Accessibility Act and ADA Title III, eliminating legal liability and non-discrimination regulatory penalties.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-4 px-6 text-center text-xs ${
          highContrast
            ? "border-yellow-400 bg-black text-yellow-400"
            : "border-slate-900 bg-slate-950 text-slate-500"
        }`}
      >
        <p>AccessibleKYC (EquiSign) • Designed for AT4D &amp; Universal Digital Inclusion</p>
      </footer>
    </div>
  );
}
