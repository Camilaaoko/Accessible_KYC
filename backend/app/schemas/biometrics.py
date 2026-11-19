from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class HapticState(str, Enum):
    SEARCHING = "SEARCHING"
    APPROACHING_CENTER = "APPROACHING_CENTER"
    OUT_OF_BOUNDS = "OUT_OF_BOUNDS"
    ALIGNED_READY = "ALIGNED_READY"


class Point3D(BaseModel):
    x: float
    y: float
    z: float = 0.0


class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class HapticFeedbackDirective(BaseModel):
    state: HapticState
    pulse_interval_ms: int = Field(..., description="Milliseconds between haptic pulses (e.g. 1500ms down to 100ms)")
    pulse_intensity: float = Field(..., ge=0.0, le=1.0, description="Normalized vibration strength (0.0 to 1.0)")
    vibration_pattern: str = Field(..., description="Pattern identifier (e.g. 'heartbeat', 'geiger_rapid', 'dull_buzz', 'double_tap')")
    audio_hint: Optional[str] = Field(None, description="Optional spoken guidance fallback for dual-sensory support")


class LandmarkStabilizeRequest(BaseModel):
    landmarks: List[Point3D]
    stream_id: Optional[str] = "default"
    process_noise: Optional[float] = Field(0.005, description="Kalman process covariance Q")
    measurement_noise: Optional[float] = Field(0.05, description="Kalman measurement covariance R")


class LandmarkStabilizeResponse(BaseModel):
    stabilized_landmarks: List[Point3D]
    jitter_detected: bool
    jitter_magnitude: float
    smoothed_centroid: Point3D
    haptic_directive: HapticFeedbackDirective


class TremorSimulationRequest(BaseModel):
    landmarks: List[Point3D]
    tremor_frequency_hz: float = Field(6.0, description="Typical resting/postural tremor frequency (4-8 Hz)")
    tremor_amplitude: float = Field(0.03, description="Tremor amplitude in normalized coordinates")
    num_frames: int = Field(30, ge=1, le=120)


class VerificationRequest(BaseModel):
    session_id: str
    selfie_image_base64: Optional[str] = None
    id_card_image_base64: Optional[str] = None
    landmark_stream: Optional[List[List[Point3D]]] = None


class VerificationResponse(BaseModel):
    verified: bool
    liveness_score: float = Field(..., ge=0.0, le=1.0)
    face_match_score: float = Field(..., ge=0.0, le=1.0)
    stabilization_applied: bool
    elapsed_ms: float
    summary: str
    haptic_result: HapticFeedbackDirective
