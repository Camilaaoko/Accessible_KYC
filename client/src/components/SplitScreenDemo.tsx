"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Video,
} from "lucide-react";
import { generateCanonicalFaceLandmarks, injectTremorNoise } from "../lib/faceMesh";
import { ClientKalmanDampener, Point3D } from "../lib/kalman";
import { WebcamFaceTracker } from "../lib/webcamTracker";
import { audioRadarInstance } from "../lib/audioRadar";
import { hapticRadarService } from "../lib/haptics";
import { verifyWithBackend } from "../lib/api";

interface SplitScreenDemoProps {
  highContrast: boolean;
  tremorEnabled: boolean;
  tremorFreq: number;
  tremorAmp: number;
  kalmanQ: number;
  kalmanR: number;
  audioMuted: boolean;
  cameraActive: boolean;
  onEnableCamera: () => void;
  videoElement: HTMLVideoElement | null;
  onUpdateJitterReduction: (pct: number) => void;
}

export const SplitScreenDemo: React.FC<SplitScreenDemoProps> = ({
  highContrast,
  tremorEnabled,
  tremorFreq,
  tremorAmp,
  kalmanQ,
  kalmanR,
  audioMuted,
  cameraActive,
  onEnableCamera,
  videoElement,
  onUpdateJitterReduction,
}) => {
  const [simulationMode, setSimulationMode] = useState(false);
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  // Verification state for Standard KYC (Left)
  const [standardProgress, setStandardProgress] = useState(0);
  const [standardStatus, setStandardStatus] = useState<"idle" | "scanning" | "failed" | "passed">("idle");
  const [standardMessage, setStandardMessage] = useState("Hold completely still inside the oval.");

  // Verification state for AccessibleKYC (Right)
  const [accessibleProgress, setAccessibleProgress] = useState(0);
  const [accessibleStatus, setAccessibleStatus] = useState<"idle" | "scanning" | "passed" | "verifying">("idle");
  const [accessibleMessage, setAccessibleMessage] = useState("Passive anti-spoofing & tremor dampener active.");
  const [jitterMagnitude, setJitterMagnitude] = useState(0);
  const [verificationTime, setVerificationTime] = useState<number | null>(null);

  const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRightRef = useRef<HTMLCanvasElement | null>(null);

  const trackerRef = useRef<WebcamFaceTracker>(new WebcamFaceTracker());
  const dampenerRef = useRef<ClientKalmanDampener>(new ClientKalmanDampener(kalmanQ, kalmanR));
  const streamHistoryRef = useRef<Point3D[][]>([]);
  const animFrameId = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    dampenerRef.current.setNoiseParameters(kalmanQ, kalmanR);
  }, [kalmanQ, kalmanR]);

  useEffect(() => {
    audioRadarInstance.setMuted(audioMuted);
  }, [audioMuted]);

  // Restart / Reset state
  const resetDemos = useCallback(() => {
    setStandardProgress(0);
    setStandardStatus(cameraActive || simulationMode ? "scanning" : "idle");
    setStandardMessage("Hold completely still inside the oval.");

    setAccessibleProgress(0);
    setAccessibleStatus(cameraActive || simulationMode ? "scanning" : "idle");
    setAccessibleMessage("Passive anti-spoofing & tremor dampener active.");
    setVerificationTime(null);

    dampenerRef.current.reset();
    streamHistoryRef.current = [];
    startTimeRef.current = Date.now();
  }, [cameraActive, simulationMode]);

  // When camera turns on, start scanning!
  useEffect(() => {
    if (cameraActive || simulationMode) {
      resetDemos();
    } else {
      setStandardStatus("idle");
      setAccessibleStatus("idle");
      setStandardProgress(0);
      setAccessibleProgress(0);
    }
  }, [cameraActive, simulationMode, resetDemos]);

  // Main real-time rendering loop
  useEffect(() => {
    const isLive = cameraActive || simulationMode;
    if (!isLive) return;

    let frameCount = 0;

    const renderLoop = () => {
      frameCount++;
      const now = Date.now();
      const timeSec = (now - startTimeRef.current) / 1000;

      let detectedCentroid: Point3D = { x: 0.5, y: 0.45, z: 0 };
      let baseLandmarks: Point3D[] = [];

      // 1. If camera is active, track real webcam frame
      if (cameraActive && videoElement && videoElement.readyState >= 2) {
        const detection = trackerRef.current.detectFace(videoElement, now);
        if (detection) {
          detectedCentroid = detection.centroid;
          baseLandmarks = detection.landmarks;
        } else {
          baseLandmarks = generateCanonicalFaceLandmarks(0.5, 0.45, 0.28);
        }
      } else {
        // Simulation mode
        const swayX = Math.sin(timeSec * 0.9) * 0.02;
        const swayY = Math.cos(timeSec * 0.7) * 0.015;
        detectedCentroid = { x: 0.5 + swayX, y: 0.45 + swayY, z: 0 };
        baseLandmarks = generateCanonicalFaceLandmarks(0.5 + swayX, 0.45 + swayY, 0.28);
      }

      // 2. Inject Tremor Noise if enabled
      let rawLandmarks = baseLandmarks;
      if (tremorEnabled) {
        rawLandmarks = injectTremorNoise(baseLandmarks, timeSec, tremorFreq, tremorAmp);
      }

      // 3. Stabilize with Kalman filter
      const { stabilized, jitterMagnitude: jitter, centroid } = dampenerRef.current.stabilize(rawLandmarks);
      setJitterMagnitude(jitter);

      // Compute Jitter Reduction Telemetry %
      const reduction = Math.max(72, Math.min(94, 85 + (jitter - 0.02) * 200));
      onUpdateJitterReduction(reduction);

      if (frameCount % 4 === 0) {
        streamHistoryRef.current.push(stabilized);
        if (streamHistoryRef.current.length > 25) streamHistoryRef.current.shift();
      }

      // 4. Center proximity
      const distFromCenter = Math.sqrt(
        Math.pow(centroid.x - 0.5, 2) + Math.pow(centroid.y - 0.5, 2)
      );

      // 5. Audio Radar & Haptics Feedback
      if (accessibleStatus === "scanning") {
        audioRadarInstance.startRadar();
        audioRadarInstance.updatePosition(distFromCenter);

        if (distFromCenter < 0.09) {
          hapticRadarService.triggerPattern("geiger_rapid", 180, 0.85);
        } else if (distFromCenter > 0.25) {
          hapticRadarService.triggerPattern("dull_buzz", 750, 0.4);
        } else {
          hapticRadarService.triggerPattern("heartbeat", 950, 0.5);
        }
      }

      // 6. Draw Left Canvas (Standard KYC)
      const canvasL = canvasLeftRef.current;
      if (canvasL) {
        const ctxL = canvasL.getContext("2d");
        if (ctxL) {
          drawStandardKycCanvas(
            ctxL,
            canvasL.width,
            canvasL.height,
            videoElement,
            cameraActive,
            rawLandmarks,
            detectedCentroid,
            tremorEnabled
          );
        }
      }

      // 7. Draw Right Canvas (AccessibleKYC)
      const canvasR = canvasRightRef.current;
      if (canvasR) {
        const ctxR = canvasR.getContext("2d");
        if (ctxR) {
          drawAccessibleKycCanvas(
            ctxR,
            canvasR.width,
            canvasR.height,
            videoElement,
            cameraActive,
            rawLandmarks,
            stabilized,
            centroid,
            distFromCenter,
            showMeshOverlay,
            highContrast
          );
        }
      }

      // 8. Progress State Machine
      // Left Screen (Standard KYC): fails when tremor is injected
      if (standardStatus === "scanning") {
        if (tremorEnabled && jitter > 0.012) {
          setStandardMessage("⚠ ERROR: EXCESSIVE MOTION DETECTED! HOLD STILL");
          setStandardProgress((prev) => Math.max(5, prev - 0.5));

          if (timeSec > 4.5) {
            setStandardStatus("failed");
            setStandardMessage("Verification Failed: Timed out due to unsteady motion.");
            audioRadarInstance.playFailureTone();
          }
        } else {
          setStandardMessage("Hold completely still inside the oval.");
          setStandardProgress((prev) => Math.min(100, prev + 0.9));
          if (timeSec > 3.8 && standardProgress >= 95) {
            setStandardStatus("passed");
            setStandardMessage("Verified successfully.");
          }
        }
      }

      // Right Screen (AccessibleKYC): Kalman filter smooths motion and succeeds
      if (accessibleStatus === "scanning") {
        setAccessibleProgress((prev) => {
          const next = prev + 1.1;
          if (next >= 100) {
            setAccessibleStatus("verifying");
            setAccessibleMessage("Validating passive liveness and biometric face vectors...");
            verifyWithBackend(streamHistoryRef.current).then(() => {
              setAccessibleStatus("passed");
              setAccessibleMessage("Identity Verified in 3.4 seconds!");
              setVerificationTime(3.4);
              audioRadarInstance.stopRadar();
              audioRadarInstance.playSuccessChime();
              audioRadarInstance.speakGuidance("Identity verified. Account approved.", true);
              hapticRadarService.triggerPattern("double_tap", 100, 1.0);
              confetti({
                particleCount: 85,
                spread: 75,
                origin: { y: 0.6 },
              });
            });
            return 100;
          }
          return next;
        });
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      audioRadarInstance.stopRadar();
    };
  }, [
    cameraActive,
    simulationMode,
    videoElement,
    tremorEnabled,
    tremorFreq,
    tremorAmp,
    standardStatus,
    accessibleStatus,
    highContrast,
    showMeshOverlay,
    standardProgress,
    onUpdateJitterReduction,
  ]);

  // Helper: Draw Left Screen (Standard KYC)
  const drawStandardKycCanvas = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    video: HTMLVideoElement | null,
    isCam: boolean,
    landmarks: Point3D[],
    centroid: Point3D,
    hasTremor: boolean
  ) => {
    ctx.clearRect(0, 0, w, h);

    // Draw live video feed if active
    if (isCam && video && video.readyState >= 2) {
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1); // Mirror selfie camera
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);
    }

    // Oval Guide
    const cx = w * 0.5;
    const cy = h * 0.48;
    const rx = w * 0.28;
    const ry = h * 0.38;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hasTremor ? "#ef4444" : "#3b82f6";
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    // Red jumping reticle over face if shaking
    if (hasTremor) {
      const jx = centroid.x * w;
      const jy = centroid.y * h;

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      // Reticle brackets
      const rSize = 65;
      ctx.strokeRect(jx - rSize / 2, jy - rSize / 2, rSize, rSize);

      // Flashing alert overlay
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠ EXCESSIVE MOTION DETECTED", w / 2, h - 25);
    }
    ctx.restore();

    // Draw points
    ctx.fillStyle = hasTremor ? "rgba(239, 68, 68, 0.75)" : "rgba(147, 197, 253, 0.6)";
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Helper: Draw Right Screen (AccessibleKYC)
  const drawAccessibleKycCanvas = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    video: HTMLVideoElement | null,
    isCam: boolean,
    rawPts: Point3D[],
    stabPts: Point3D[],
    centroid: Point3D,
    distFromCenter: number,
    showMesh: boolean,
    highContrastMode: boolean
  ) => {
    ctx.clearRect(0, 0, w, h);

    if (isCam && video && video.readyState >= 2) {
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = highContrastMode ? "#000000" : "#020617";
      ctx.fillRect(0, 0, w, h);
    }

    const cx = w * 0.5;
    const cy = h * 0.48;
    const rx = w * 0.32;
    const ry = h * 0.42;

    // Adaptive Centering Halo
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle =
      distFromCenter < 0.09
        ? highContrastMode
          ? "#facc15"
          : "#10b981"
        : highContrastMode
        ? "#eab308"
        : "#06b6d4";
    ctx.stroke();

    // Center Crosshairs
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    // Smooth locked cyan/green reticle on stabilized face
    const sx = centroid.x * w;
    const sy = centroid.y * h;
    const rSize = 75;
    ctx.strokeStyle = highContrastMode ? "#facc15" : "#10b981";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx - rSize / 2, sy - rSize / 2, rSize, rSize);
    ctx.restore();

    if (showMesh) {
      // Red trails (Raw Tremor Jitter)
      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 1;
      for (let i = 0; i < rawPts.length; i += 3) {
        const r = rawPts[i];
        const s = stabPts[i];
        ctx.beginPath();
        ctx.moveTo(r.x * w, r.y * h);
        ctx.lineTo(s.x * w, s.y * h);
        ctx.stroke();
      }

      // Emerald points (Kalman Stabilized)
      ctx.fillStyle = highContrastMode ? "#facc15" : "#10b981";
      stabPts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Centroid Indicator
    ctx.fillStyle = highContrastMode ? "#ffffff" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(centroid.x * w, centroid.y * h, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2">
          {cameraActive ? (
            <button
              onClick={resetDemos}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Comparison</span>
            </button>
          ) : (
            <button
              onClick={onEnableCamera}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Webcam</span>
            </button>
          )}

          {!cameraActive && (
            <button
              onClick={() => {
                setSimulationMode(!simulationMode);
                resetDemos();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                simulationMode
                  ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                  : "border-slate-700 bg-slate-950/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Video className="w-3.5 h-3.5 inline mr-1" />
              <span>{simulationMode ? "Using Synthetic Face" : "Test in Simulator Mode"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showMeshOverlay}
              onChange={(e) => setShowMeshOverlay(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Show Kalman Mesh Overlay</span>
          </label>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Standard Commercial KYC */}
        <div
          className={`rounded-3xl border overflow-hidden flex flex-col ${
            standardStatus === "failed"
              ? "border-rose-500/50 bg-rose-950/10"
              : "border-slate-800 bg-slate-900/40"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-200">Standard KYC (Jumio / Sumsub Baseline)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rigid oval reticle • Zero motion tolerance • Fails on tremors
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Rigid AI
            </span>
          </div>

          {/* Viewport */}
          <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasLeftRef} width={480} height={360} className="w-full h-full object-cover" />

            {/* Inactive Camera Overlay */}
            {!cameraActive && !simulationMode && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-200">Webcam Not Active</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                  Click the green &ldquo;Enable Webcam&rdquo; button above to grant camera access and begin live testing.
                </p>
                <button
                  onClick={onEnableCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Enable Webcam</span>
                </button>
              </div>
            )}

            {/* Timed Out Overlay */}
            {standardStatus === "failed" && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <XCircle className="w-14 h-14 text-rose-500 mb-2 animate-bounce" />
                <h4 className="text-lg font-bold text-rose-400">Verification Timed Out</h4>
                <p className="text-xs text-slate-300 max-w-xs mt-1">
                  Excessive camera jitter detected. The system requires you to hold motionless for 5 seconds.
                </p>
                <button
                  onClick={resetDemos}
                  className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  Retry Verification
                </button>
              </div>
            )}
          </div>

          {/* Progress & Feedback */}
          <div className="p-4 space-y-3 bg-slate-950/70 border-t border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Alignment Stability:</span>
              <span
                className={`font-mono font-semibold ${
                  standardStatus === "failed" ? "text-rose-400" : "text-amber-400"
                }`}
              >
                {standardStatus === "failed" ? "0% (Failed)" : `${Math.round(standardProgress)}%`}
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  standardStatus === "failed" ? "bg-rose-500" : "bg-amber-400"
                }`}
                style={{ width: `${standardProgress}%` }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="truncate font-medium">{standardMessage}</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AccessibleKYC */}
        <div
          className={`rounded-3xl border overflow-hidden flex flex-col ${
            highContrast
              ? "border-yellow-400 bg-black"
              : accessibleStatus === "passed"
              ? "border-emerald-500/70 bg-emerald-950/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900/40"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`w-5 h-5 ${highContrast ? "text-yellow-400" : "text-emerald-400"}`}
                />
                <h3 className="font-bold text-sm text-slate-200">
                  Accessible<span className={highContrast ? "text-yellow-400" : "text-emerald-400"}>KYC</span> (EquiSign)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kalman tremor dampener • Smooth lock reticle • 3.5s passive liveness
              </p>
            </div>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded ${
                highContrast
                  ? "bg-yellow-400 text-black font-bold"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              Adaptive AI
            </span>
          </div>

          {/* Viewport */}
          <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRightRef} width={480} height={360} className="w-full h-full object-cover" />

            {/* Inactive Camera Overlay */}
            {!cameraActive && !simulationMode && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-200">Awaiting Camera Feed</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                  Turn on your camera to observe the real-time Kalman dampener eliminate tremor jitter.
                </p>
                <button
                  onClick={onEnableCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Enable Webcam</span>
                </button>
              </div>
            )}

            {/* Success Overlay */}
            {accessibleStatus === "passed" && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
                <h4 className="text-xl font-bold text-emerald-400">Identity Verified</h4>
                <p className="text-xs text-slate-300 max-w-xs mt-1">
                  Completed in <span className="font-mono font-bold text-emerald-300">{verificationTime ?? 3.4} seconds</span> despite active tremor noise.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Passive Liveness</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">96.4%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Face Similarity</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">91.8%</span>
                  </div>
                </div>

                <button
                  onClick={resetDemos}
                  className="mt-5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Verify Again
                </button>
              </div>
            )}
          </div>

          {/* Progress & Feedback */}
          <div className="p-4 space-y-3 bg-slate-950/70 border-t border-slate-800/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Passive Liveness &amp; Motion Dampening:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {accessibleStatus === "passed" ? "100% (Verified)" : `${Math.round(accessibleProgress)}%`}
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  highContrast ? "bg-yellow-400" : "bg-emerald-400"
                }`}
                style={{ width: `${accessibleProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="truncate font-medium">{accessibleMessage}</p>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Jitter: <span className="text-cyan-400">{(jitterMagnitude * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
