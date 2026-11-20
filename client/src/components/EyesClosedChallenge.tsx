"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  EyeOff,
  Eye,
  CheckCircle2,
  Volume2,
  Smartphone,
  RotateCcw,
  HelpCircle,
  Camera,
} from "lucide-react";
import { WebcamFaceTracker } from "../lib/webcamTracker";
import { audioRadarInstance } from "../lib/audioRadar";
import { hapticRadarService } from "../lib/haptics";

interface EyesClosedChallengeProps {
  highContrast: boolean;
  audioMuted: boolean;
  cameraActive: boolean;
  onEnableCamera: () => void;
  videoElement: HTMLVideoElement | null;
}

export const EyesClosedChallenge: React.FC<EyesClosedChallengeProps> = ({
  highContrast,
  audioMuted,
  cameraActive,
  onEnableCamera,
  videoElement,
}) => {
  const [screenShieldActive, setScreenShieldActive] = useState(true);
  const [userHeadX, setUserHeadX] = useState(0.32); // Initial offset
  const [userHeadY, setUserHeadY] = useState(0.28);
  const [isHoldingSteady, setIsHoldingSteady] = useState(false);
  const [steadyCounter, setSteadyCounter] = useState(0);
  const [verified, setVerified] = useState(false);
  const [spokenPrompt, setSpokenPrompt] = useState("Move your head slowly toward center.");

  const steadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trackerRef = useRef(new WebcamFaceTracker());

  useEffect(() => {
    audioRadarInstance.setMuted(audioMuted);
  }, [audioMuted]);

  // Real-time camera tracking if camera is active
  useEffect(() => {
    if (!cameraActive || !videoElement || verified) return;

    let animId: number;
    const trackLoop = () => {
      const now = Date.now();
      if (videoElement.readyState >= 2) {
        const detection = trackerRef.current.detectFace(videoElement, now);
        if (detection) {
          setUserHeadX(detection.centroid.x);
          setUserHeadY(detection.centroid.y);
        }
      }
      animId = requestAnimationFrame(trackLoop);
    };

    animId = requestAnimationFrame(trackLoop);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, videoElement, verified]);

  // Distance from center (0.5, 0.45)
  const distFromCenter = Math.sqrt(
    Math.pow(userHeadX - 0.5, 2) + Math.pow(userHeadY - 0.45, 2)
  );

  const isCentered = distFromCenter < 0.085;

  // Sound and Haptic feedback loop
  useEffect(() => {
    if (verified) return;

    audioRadarInstance.startRadar();
    audioRadarInstance.updatePosition(distFromCenter);

    if (isCentered) {
      hapticRadarService.triggerPattern("geiger_rapid", 160, 0.9);
      setSpokenPrompt("Centered! Hold steady for 2 seconds...");
      audioRadarInstance.speakGuidance("Centered. Hold steady.");
    } else if (distFromCenter > 0.22) {
      hapticRadarService.triggerPattern("dull_buzz", 700, 0.4);
      if (userHeadX < 0.4) {
        setSpokenPrompt("Pan head slightly to your right.");
      } else if (userHeadX > 0.6) {
        setSpokenPrompt("Pan head slightly to your left.");
      } else if (userHeadY < 0.35) {
        setSpokenPrompt("Tilt head slightly downwards.");
      } else {
        setSpokenPrompt("Tilt head slightly upwards.");
      }
    } else {
      hapticRadarService.triggerPattern("heartbeat", 850, 0.55);
      setSpokenPrompt("Approaching center. Listen to the Geiger clicks accelerate.");
    }
  }, [userHeadX, userHeadY, isCentered, distFromCenter, verified]);

  // Holding steady timer
  useEffect(() => {
    if (verified) return;

    if (isCentered) {
      setIsHoldingSteady(true);
      steadyTimerRef.current = setInterval(() => {
        setSteadyCounter((prev) => {
          if (prev >= 100) {
            clearInterval(steadyTimerRef.current!);
            completeVerification();
            return 100;
          }
          return prev + 15;
        });
      }, 200);
    } else {
      setIsHoldingSteady(false);
      setSteadyCounter(0);
      if (steadyTimerRef.current) clearInterval(steadyTimerRef.current);
    }

    return () => {
      if (steadyTimerRef.current) clearInterval(steadyTimerRef.current);
    };
  }, [isCentered, verified]);

  const completeVerification = () => {
    setVerified(true);
    audioRadarInstance.stopRadar();
    audioRadarInstance.playSuccessChime();
    audioRadarInstance.speakGuidance("Identity Verified! You may now open your eyes.", true);
    hapticRadarService.triggerPattern("double_tap", 100, 1.0);
    confetti({
      particleCount: 95,
      spread: 75,
      origin: { y: 0.5 },
    });
  };

  const resetChallenge = () => {
    setVerified(false);
    setSteadyCounter(0);
    setUserHeadX(0.3);
    setUserHeadY(0.28);
    setScreenShieldActive(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overview Banner */}
      <div
        className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          highContrast
            ? "bg-black border-yellow-400 text-yellow-300"
            : "bg-slate-900/70 border-slate-800 text-slate-200"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold">The &ldquo;Eyes-Closed&rdquo; Tactile &amp; Audio Challenge</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulate the non-visual experience for blind and low-vision users. Hand your laptop to a
            judge, close your eyes, and align your face purely through pitch-rising Geiger clicks and
            haptic vibrations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!cameraActive && (
            <button
              onClick={onEnableCamera}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Webcam</span>
            </button>
          )}

          <button
            onClick={() => setScreenShieldActive(!screenShieldActive)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              screenShieldActive
                ? "bg-slate-800 text-slate-200 border-slate-700"
                : "bg-emerald-500 text-slate-950 border-emerald-400"
            }`}
          >
            {screenShieldActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{screenShieldActive ? "Blindfold Shield: ON" : "Peek Mode: ON"}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative rounded-3xl border border-slate-800 bg-black aspect-[16/10] overflow-hidden flex items-center justify-center">
        {/* Underneath: The actual positioning coordinates (visible in Peek mode) */}
        <div className="absolute inset-0 p-8 flex flex-col items-center justify-center">
          {/* Target centering oval */}
          <div
            className={`w-48 h-64 rounded-[50%] border-4 transition-all duration-300 flex items-center justify-center ${
              isCentered
                ? "border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.4)]"
                : "border-slate-700"
            }`}
          >
            <div className="text-center text-xs text-slate-400">
              <span className="font-mono text-emerald-400 font-bold block text-sm">Target Center</span>
              {isCentered ? "Lock Achieved" : "Steer Face Here"}
            </div>
          </div>

          {/* User Face dot (steered by webcam or sliders) */}
          <div
            className={`absolute w-12 h-12 rounded-full border-2 transition-transform duration-75 flex items-center justify-center shadow-lg pointer-events-none ${
              isCentered
                ? "bg-emerald-500 border-white text-slate-950 scale-110"
                : "bg-cyan-500/80 border-cyan-300 text-white"
            }`}
            style={{
              left: `${userHeadX * 100}%`,
              top: `${userHeadY * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Smartphone className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Blindfold Privacy Curtain (Simulates Zero Visual Feedback) */}
        {screenShieldActive && !verified && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="relative mb-6">
              <div
                className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all ${
                  isCentered
                    ? "border-emerald-400 bg-emerald-500/20 scale-110 animate-pulse shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <EyeOff
                  className={`w-12 h-12 ${
                    isCentered ? "text-emerald-400" : "text-slate-600"
                  }`}
                />
              </div>
              {isCentered && (
                <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/50 animate-ping" />
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-100">
              {isCentered ? "Face Centered! Hold Steady..." : "Eyes-Closed Sensory Guidance"}
            </h3>

            <p className="text-sm font-medium text-emerald-300 mt-2 max-w-md">
              &ldquo;{spokenPrompt}&rdquo;
            </p>

            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Geiger-counter clicks accelerate in pitch &amp; frequency as you center.</span>
            </div>

            {/* Hold steady progress */}
            {isHoldingSteady && (
              <div className="w-64 mt-6">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Capturing stabilized frame...</span>
                  <span className="font-mono text-emerald-400">{steadyCounter}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${steadyCounter}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Modal */}
        {verified && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-2xl font-bold text-slate-100">Identity Verified with Eyes Closed!</h3>
            <p className="text-xs text-slate-300 max-w-md mt-2">
              You navigated completely through spatial pitch sonification and haptic vibration feedback.
              Zero visual interaction needed.
            </p>

            <button
              onClick={resetChallenge}
              className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Challenge Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Steering Pad for Presenter */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Presenter Steering Pad {cameraActive && "(Webcam is also actively tracking)"}</span>
          </span>
          <span className="font-mono text-slate-400">
            Offset: {(distFromCenter * 100).toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Horizontal Steering (X):</span>
              <span className="font-mono text-cyan-400">{userHeadX.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.02"
              value={userHeadX}
              onChange={(e) => setUserHeadX(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Vertical Steering (Y):</span>
              <span className="font-mono text-cyan-400">{userHeadY.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.02"
              value={userHeadY}
              onChange={(e) => setUserHeadY(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
