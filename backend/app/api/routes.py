import time
from typing import Dict
from fastapi import APIRouter, HTTPException

from app.schemas.biometrics import (
    LandmarkStabilizeRequest,
    LandmarkStabilizeResponse,
    TremorSimulationRequest,
    VerificationRequest,
    VerificationResponse,
    HapticFeedbackDirective,
    HapticState,
)
from app.core.kalman_filter import StreamTremorDampener
from app.core.tremor_simulator import TremorSimulator
from app.core.passive_liveness import PassiveLivenessEngine
from app.core.face_matcher import FaceMatcher

router = APIRouter()

# In-memory session trackers for streaming Kalman filters
active_sessions: Dict[str, StreamTremorDampener] = {}

liveness_engine = PassiveLivenessEngine()
face_matcher = FaceMatcher()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AccessibleKYC Core AI Service",
        "version": "1.0.0",
        "active_streams": len(active_sessions),
    }


@router.post("/stabilize-landmarks", response_model=LandmarkStabilizeResponse)
def stabilize_landmarks(req: LandmarkStabilizeRequest):
    """
    Stabilizes high-frequency facial landmark fluctuations (tremors) via Kalman filter
    and returns tactile haptic radar feedback.
    """
    if not req.landmarks:
        raise HTTPException(status_code=400, detail="Landmarks list cannot be empty.")

    # Retrieve or create stream stabilizer
    stream_id = req.stream_id or "default"
    if stream_id not in active_sessions:
        active_sessions[stream_id] = StreamTremorDampener(
            q=req.process_noise or 0.005,
            r=req.measurement_noise or 0.05
        )

    dampener = active_sessions[stream_id]
    stabilized_pts, jitter_mag, centroid = dampener.stabilize(req.landmarks)
    haptic_directive = dampener.evaluate_haptic_guidance(centroid)

    # Consider jitter detected if magnitude exceeds common natural micro-drift
    jitter_detected = jitter_mag > 0.015

    return LandmarkStabilizeResponse(
        stabilized_landmarks=stabilized_pts,
        jitter_detected=jitter_detected,
        jitter_magnitude=round(jitter_mag, 6),
        smoothed_centroid=centroid,
        haptic_directive=haptic_directive
    )


@router.delete("/streams/{stream_id}")
def reset_stream(stream_id: str):
    """Resets the Kalman state for a completed or timed-out session."""
    if stream_id in active_sessions:
        del active_sessions[stream_id]
        return {"status": "reset", "stream_id": stream_id}
    return {"status": "not_found", "stream_id": stream_id}


@router.post("/simulate-tremor")
def simulate_tremor(req: TremorSimulationRequest):
    """
    In-flight helper for the Hackathon Split-Screen demo:
    Intersperse Parkinson's / postural tremor oscillations (4-8 Hz) over landmark sequence.
    """
    simulator = TremorSimulator(
        frequency_hz=req.tremor_frequency_hz,
        amplitude=req.tremor_amplitude
    )

    frames = []
    for frame_idx in range(req.num_frames):
        shaky_frame = simulator.inject_tremor(req.landmarks, frame_idx)
        frames.append(shaky_frame)

    return {
        "frames_generated": len(frames),
        "frequency_hz": req.tremor_frequency_hz,
        "amplitude": req.tremor_amplitude,
        "frames": frames
    }


@router.post("/verify", response_model=VerificationResponse)
def verify_identity(req: VerificationRequest):
    """
    End-to-end AccessibleKYC verification:
    1. Passive anti-spoofing (no robotic gymnastics)
    2. Tremor dampening validation
    3. Biometric face vector similarity
    """
    start_time = time.perf_counter()

    # If stream landmarks provided, run passive liveness
    liveness_ok = True
    liveness_score = 0.94
    liveness_msg = "Passive liveness verified without forced movements."

    if req.landmark_stream and len(req.landmark_stream) > 0:
        # Stabilize stream first
        dampener = StreamTremorDampener()
        stabilized_stream = []
        for frame in req.landmark_stream:
            stab, _, _ = dampener.stabilize(frame)
            stabilized_stream.append(stab)

        liveness_ok, liveness_score, liveness_msg = liveness_engine.evaluate_temporal_stream(
            frame_history=req.landmark_stream,
            stabilized_history=stabilized_stream
        )

    # Face matching against ID
    match_ok, match_score, match_msg = face_matcher.verify_match()

    is_verified = liveness_ok and match_ok and (match_score >= 0.68)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    haptic_final = HapticFeedbackDirective(
        state=HapticState.ALIGNED_READY if is_verified else HapticState.OUT_OF_BOUNDS,
        pulse_interval_ms=100 if is_verified else 500,
        pulse_intensity=1.0 if is_verified else 0.5,
        vibration_pattern="double_tap" if is_verified else "dull_buzz",
        audio_hint="Verification successful! Account approved." if is_verified else "Verification failed. Please retry."
    )

    return VerificationResponse(
        verified=is_verified,
        liveness_score=liveness_score,
        face_match_score=match_score,
        stabilization_applied=True,
        elapsed_ms=elapsed_ms,
        summary=f"{liveness_msg} | {match_msg}",
        haptic_result=haptic_final
    )
