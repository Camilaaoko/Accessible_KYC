import math
import numpy as np
import pytest

from app.core.kalman_filter import KalmanFilter1D, StreamTremorDampener
from app.core.tremor_simulator import TremorSimulator
from app.core.passive_liveness import PassiveLivenessEngine
from app.schemas.biometrics import Point3D, HapticState, LandmarkStabilizeRequest, VerificationRequest
from app.api.routes import health_check, stabilize_landmarks, verify_identity, simulate_tremor


def test_kalman_1d_noise_reduction():
    """Verify that Kalman filter dampens high-frequency Gaussian noise on a constant signal."""
    np.random.seed(42)
    true_val = 0.5
    noise_sigma = 0.05
    raw_samples = [true_val + np.random.normal(0, noise_sigma) for _ in range(100)]

    kf = KalmanFilter1D(process_noise_q=0.001, measurement_noise_r=0.05)
    filtered = [kf.update(val) for val in raw_samples]

    raw_variance = np.var(raw_samples)
    filtered_variance = np.var(filtered[20:])  # evaluate post-convergence

    # Filtered variance should be significantly lower than raw noisy input
    assert filtered_variance < raw_variance * 0.4
    assert abs(filtered[-1] - true_val) < 0.02


def test_stream_tremor_dampener_reduces_jitter():
    """Simulate a 6 Hz Parkinson's tremor and check that dampener attenuates jitter."""
    base_landmarks = [
        Point3D(x=0.50, y=0.50, z=0.0),  # nose
        Point3D(x=0.45, y=0.45, z=0.02), # left eye
        Point3D(x=0.55, y=0.45, z=0.02), # right eye
        Point3D(x=0.50, y=0.60, z=0.01), # mouth
    ]

    simulator = TremorSimulator(frequency_hz=6.0, amplitude=0.04)
    dampener = StreamTremorDampener(q=0.005, r=0.05)

    raw_nose_x = []
    filtered_nose_x = []

    for f_idx in range(60):
        shaky = simulator.inject_tremor(base_landmarks, f_idx, fps=30.0)
        raw_nose_x.append(shaky[0].x)
        stabilized, jitter, centroid = dampener.stabilize(shaky)
        filtered_nose_x.append(stabilized[0].x)

    # Tremor amplitude on filtered stream should be substantially reduced
    raw_oscillation = max(raw_nose_x[20:]) - min(raw_nose_x[20:])
    filtered_oscillation = max(filtered_nose_x[20:]) - min(filtered_nose_x[20:])

    assert filtered_oscillation < raw_oscillation * 0.65


def test_tactile_haptic_radar_states():
    """Verify that haptic guidance translates centroid position accurately."""
    # 1. Perfectly centered face
    center_directive = StreamTremorDampener.evaluate_haptic_guidance(Point3D(x=0.50, y=0.50))
    assert center_directive.state == HapticState.ALIGNED_READY
    assert center_directive.vibration_pattern == "double_tap"
    assert center_directive.pulse_interval_ms == 100

    # 2. Approaching center (moderate offset)
    approaching_directive = StreamTremorDampener.evaluate_haptic_guidance(Point3D(x=0.58, y=0.58))
    assert approaching_directive.state == HapticState.APPROACHING_CENTER
    assert approaching_directive.vibration_pattern == "geiger_rapid"
    assert 100 < approaching_directive.pulse_interval_ms <= 1200

    # 3. Far out of bounds
    oob_directive = StreamTremorDampener.evaluate_haptic_guidance(Point3D(x=0.88, y=0.88))
    assert oob_directive.state == HapticState.OUT_OF_BOUNDS
    assert oob_directive.vibration_pattern == "dull_buzz"
    assert oob_directive.audio_hint is not None


def test_passive_liveness_detects_static_photo():
    """Flat 2D photograph with zero organic drift should fail passive liveness."""
    engine = PassiveLivenessEngine(min_frames_required=10)

    # Identical frames with flat z=0
    static_frame = [Point3D(x=0.5, y=0.5, z=0.0), Point3D(x=0.52, y=0.48, z=0.0)]
    static_stream = [static_frame for _ in range(15)]

    is_live, score, msg = engine.evaluate_temporal_stream(static_stream, static_stream)
    assert not is_live
    assert score < 0.5
    assert "2D spoof" in msg


def test_api_health_endpoint():
    data = health_check()
    assert data["status"] == "healthy"
    assert "AccessibleKYC" in data["service"]


def test_api_stabilize_landmarks():
    req = LandmarkStabilizeRequest(
        stream_id="test_session_1",
        landmarks=[
            Point3D(x=0.50, y=0.50, z=0.0),
            Point3D(x=0.45, y=0.45, z=0.01)
        ]
    )
    res = stabilize_landmarks(req)
    assert len(res.stabilized_landmarks) == 2
    assert res.haptic_directive.state == HapticState.ALIGNED_READY


def test_api_verify_endpoint():
    stream = [
        [
            Point3D(x=0.50 + i * 0.001, y=0.50, z=0.05 + i * 0.0005),
            Point3D(x=0.52, y=0.48, z=0.02)
        ]
        for i in range(16)
    ]
    req = VerificationRequest(
        session_id="session_abc123",
        landmark_stream=stream
    )
    res = verify_identity(req)
    assert res.verified is True
    assert res.liveness_score >= 0.7
    assert res.face_match_score >= 0.68
    assert res.haptic_result.state == HapticState.ALIGNED_READY
