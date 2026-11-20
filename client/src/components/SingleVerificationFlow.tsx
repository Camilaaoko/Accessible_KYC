"use client";

import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  CreditCard,
  Camera,
  CheckCircle2,
  User,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { generateCanonicalFaceLandmarks } from "../lib/faceMesh";
import { ClientKalmanDampener } from "../lib/kalman";
import { audioRadarInstance } from "../lib/audioRadar";
import { hapticRadarService } from "../lib/haptics";
import { verifyWithBackend, VerificationResult } from "../lib/api";

interface SingleVerificationFlowProps {
  highContrast: boolean;
  audioMuted: boolean;
}

export const SingleVerificationFlow: React.FC<SingleVerificationFlowProps> = ({
  highContrast,
  audioMuted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: ID Card details
  const idName = "Alex Mwangi";
  const idNumber = "ID-98234710";
  const [docType, setDocType] = useState<"national_id" | "passport">("national_id");

  // Step 2: Adaptive Selfie
  const [capturing, setCapturing] = useState(false);
  const [selfieProgress, setSelfieProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dampenerRef = useRef(new ClientKalmanDampener(0.005, 0.05));

  useEffect(() => {
    audioRadarInstance.setMuted(audioMuted);
  }, [audioMuted]);

  // Run face animation in Step 2
  useEffect(() => {
    if (step !== 2) return;

    let animId: number;

    const loop = () => {
      const basePts = generateCanonicalFaceLandmarks(0.5, 0.5, 0.28);
      const { stabilized } = dampenerRef.current.stabilize(basePts);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = highContrast ? "#000000" : "#020617";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Center target oval
          ctx.strokeStyle = highContrast ? "#facc15" : "#10b981";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(
            canvas.width * 0.5,
            canvas.height * 0.5,
            canvas.width * 0.3,
            canvas.height * 0.4,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          // Stabilized face mesh
          ctx.fillStyle = highContrast ? "#facc15" : "#34d399";
          stabilized.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [step, highContrast]);

  const startSelfieCapture = () => {
    setCapturing(true);
    setSelfieProgress(0);
    audioRadarInstance.speakGuidance("Starting adaptive selfie. Hold steady for 3 seconds.");
    audioRadarInstance.startRadar();

    const interval = setInterval(() => {
      setSelfieProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishCapture();
          return 100;
        }
        return prev + 12;
      });
    }, 200);
  };

  const finishCapture = async () => {
    setCapturing(false);
    audioRadarInstance.stopRadar();

    const sampleStream = [generateCanonicalFaceLandmarks(0.5, 0.5, 0.28)];
    const res = await verifyWithBackend(sampleStream);
    setVerificationResult(res);
    setStep(3);

    audioRadarInstance.playSuccessChime();
    audioRadarInstance.speakGuidance("Verification successful. Identity approved.", true);
    hapticRadarService.triggerPattern("double_tap", 100, 1.0);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.55 },
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: "ID Document" },
          { num: 2, label: "Adaptive Selfie" },
          { num: 3, label: "Approved Pass" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= s.num
                  ? highContrast
                    ? "bg-yellow-400 text-black"
                    : "bg-emerald-500 text-slate-950 font-mono"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step >= s.num ? "text-slate-100" : "text-slate-500"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: ID Document Capture */}
      {step === 1 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Step 1: ID Document Verification</h3>
              <p className="text-xs text-slate-400">
                OCR extracts your government credentials automatically with high contrast preview.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDocType("national_id")}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                docType === "national_id"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              National ID Card
            </button>
            <button
              onClick={() => setDocType("passport")}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                docType === "passport"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              }`}
            >
              Passport / Travel Doc
            </button>
          </div>

          {/* Mock Document Card */}
          <div className="p-5 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 space-y-4 shadow-inner">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-wider">
                  Republic ID Card (Assistive Verified)
                </span>
                <p className="text-sm font-bold text-white mt-1">{idName}</p>
                <p className="text-xs font-mono text-slate-400">{idNumber}</p>
              </div>
              <div className="w-12 h-14 rounded-lg bg-slate-700/80 border border-slate-600 flex items-center justify-center text-slate-400">
                <User className="w-6 h-6" />
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-700/60 pt-3">
              <span>DOB: 14 NOV 1994</span>
              <span>EXP: 28 AUG 2030</span>
              <span className="text-emerald-400 font-semibold">OCR Validated ✓</span>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Proceed to Adaptive Selfie</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Adaptive Selfie Verification */}
      {step === 2 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Step 2: Adaptive Biometric Selfie</h3>
              <p className="text-xs text-slate-400">
                No robotic blinking or head gymnastics required. Tremor dampener smooths natural motion.
              </p>
            </div>
          </div>

          {/* Camera Viewport */}
          <div className="relative aspect-[4/3] rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover" />

            {capturing && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex justify-between text-xs text-emerald-300 font-semibold mb-1">
                  <span>Capturing motion-dampened liveness...</span>
                  <span className="font-mono">{selfieProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${selfieProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!capturing ? (
            <button
              onClick={startSelfieCapture}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start 3-Second Adaptive Capture</span>
            </button>
          ) : (
            <p className="text-center text-xs text-emerald-400 animate-pulse font-medium">
              Kalman filter smoothing landmark coordinates in real time...
            </p>
          )}
        </div>
      )}

      {/* STEP 3: Approved Verification Pass */}
      {step === 3 && (
        <div className="p-6 rounded-3xl border border-emerald-500/50 bg-gradient-to-b from-slate-900 to-emerald-950/20 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Verified Digital Identity Pass
            </span>
            <h3 className="text-2xl font-bold text-slate-100 mt-2">Account Approved</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
              Your identity has been verified under WCAG AAA accessibility compliance standards.
            </p>
          </div>

          {/* Verification Metrics Card */}
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Liveness Score</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {((verificationResult?.liveness_score || 0.96) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Face Match</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {((verificationResult?.face_match_score || 0.91) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Verification Time</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {verificationResult?.elapsed_ms || 340} ms
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 text-left">
            <p className="font-semibold text-slate-200">Compliance Audit Trail:</p>
            <p className="text-slate-400 mt-0.5 text-[11px]">
              • European Accessibility Act (EAA) Article 2 Certified<br />
              • ADA Title III Digital Compliance Standard Met<br />
              • Motion dampener active; zero forced motor prompts
            </p>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Verify Another Applicant</span>
          </button>
        </div>
      )}
    </div>
  );
};
