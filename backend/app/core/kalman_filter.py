import math
from typing import Dict, List, Tuple
from app.schemas.biometrics import Point3D, HapticState, HapticFeedbackDirective


class KalmanFilter1D:
    """
    One-dimensional Kalman filter for smoothing noisy/erratic coordinate streams.
    State: [position, velocity]
    """
    def __init__(self, process_noise_q: float = 0.005, measurement_noise_r: float = 0.05):
        self.q = process_noise_q  # Process variance
        self.r = measurement_noise_r  # Measurement variance
        
        self.x = 0.0  # Estimated state (position)
        self.v = 0.0  # Estimated velocity
        self.p = 1.0  # Estimation error covariance
        self.initialized = False

    def update(self, measurement: float, dt: float = 1.0) -> float:
        if not self.initialized:
            self.x = measurement
            self.v = 0.0
            self.p = 1.0
            self.initialized = True
            return self.x

        # 1. Prediction step
        x_pred = self.x + self.v * dt
        p_pred = self.p + self.q

        # 2. Measurement update (Kalman Gain)
        k = p_pred / (p_pred + self.r)
        self.x = x_pred + k * (measurement - x_pred)
        self.v = (self.x - x_pred) / max(dt, 1e-4)
        self.p = (1.0 - k) * p_pred

        return self.x

    def reset(self):
        self.initialized = False
        self.x = 0.0
        self.v = 0.0
        self.p = 1.0


class Point3DKalmanFilter:
    """Kalman filter for a single 3D point (x, y, z)."""
    def __init__(self, q: float = 0.005, r: float = 0.05):
        self.fx = KalmanFilter1D(q, r)
        self.fy = KalmanFilter1D(q, r)
        self.fz = KalmanFilter1D(q, r)

    def update(self, pt: Point3D, dt: float = 1.0) -> Point3D:
        sx = self.fx.update(pt.x, dt)
        sy = self.fy.update(pt.y, dt)
        sz = self.fz.update(pt.z, dt)
        return Point3D(x=round(sx, 6), y=round(sy, 6), z=round(sz, 6))


class StreamTremorDampener:
    """
    Multi-point facial landmark stabilizer for streaming video sessions.
    Maintains filters for all tracked landmarks and evaluates sensory steering.
    """
    def __init__(self, q: float = 0.005, r: float = 0.05):
        self.q = q
        self.r = r
        self.point_filters: Dict[int, Point3DKalmanFilter] = {}
        self.previous_raw_centroid: Point3D = None
        self.smoothed_centroid: Point3D = None

    def stabilize(self, landmarks: List[Point3D], dt: float = 1.0) -> Tuple[List[Point3D], float, Point3D]:
        """
        Stabilizes a full frame of 3D facial landmarks.
        Returns: (stabilized_landmarks, jitter_magnitude, smoothed_centroid)
        """
        if not landmarks:
            return [], 0.0, Point3D(x=0.5, y=0.5, z=0.0)

        stabilized: List[Point3D] = []
        raw_xs, raw_ys, raw_zs = [], [], []

        for idx, pt in enumerate(landmarks):
            if idx not in self.point_filters:
                self.point_filters[idx] = Point3DKalmanFilter(self.q, self.r)
            s_pt = self.point_filters[idx].update(pt, dt)
            stabilized.append(s_pt)
            raw_xs.append(pt.x)
            raw_ys.append(pt.y)
            raw_zs.append(pt.z)

        # Calculate raw centroid
        n = len(landmarks)
        raw_centroid = Point3D(
            x=sum(raw_xs) / n,
            y=sum(raw_ys) / n,
            z=sum(raw_zs) / n
        )

        # Compute smoothed centroid from stabilized landmarks
        s_centroid = Point3D(
            x=sum(p.x for p in stabilized) / n,
            y=sum(p.y for p in stabilized) / n,
            z=sum(p.z for p in stabilized) / n
        )
        self.smoothed_centroid = s_centroid

        # Compute frame-to-frame jitter magnitude (Euclidean difference)
        jitter = 0.0
        if self.previous_raw_centroid is not None:
            dx = raw_centroid.x - self.previous_raw_centroid.x
            dy = raw_centroid.y - self.previous_raw_centroid.y
            dz = raw_centroid.z - self.previous_raw_centroid.z
            jitter = math.sqrt(dx * dx + dy * dy + dz * dz)

        self.previous_raw_centroid = raw_centroid
        return stabilized, jitter, s_centroid

    @staticmethod
    def evaluate_haptic_guidance(centroid: Point3D) -> HapticFeedbackDirective:
        """
        Translates face centroid offset into the Tactile Haptic Radar vocabulary:
        - Searching: no face or extreme offset
        - Out of Bounds: drifting past boundary (low dull buzz)
        - Approaching Center: Geiger counter frequency acceleration (1500ms down to 150ms)
        - Aligned & Ready: Centered within target threshold (double tap)
        """
        center_x, center_y = 0.5, 0.5
        dx = centroid.x - center_x
        dy = centroid.y - center_y
        dist = math.sqrt(dx * dx + dy * dy)

        # Ideal center alignment threshold
        ALIGNMENT_THRESHOLD = 0.05
        OUT_OF_BOUNDS_THRESHOLD = 0.35

        if dist <= ALIGNMENT_THRESHOLD:
            return HapticFeedbackDirective(
                state=HapticState.ALIGNED_READY,
                pulse_interval_ms=100,
                pulse_intensity=1.0,
                vibration_pattern="double_tap",
                audio_hint="Perfect alignment. Capturing now."
            )
        elif dist > OUT_OF_BOUNDS_THRESHOLD:
            # Voice hint based on quadrant
            direction_hint = "Face out of bounds."
            if dy < -0.15:
                direction_hint = "Tilt phone slightly down."
            elif dy > 0.15:
                direction_hint = "Tilt phone slightly up."
            elif dx < -0.15:
                direction_hint = "Move phone slightly to the left."
            elif dx > 0.15:
                direction_hint = "Move phone slightly to the right."

            return HapticFeedbackDirective(
                state=HapticState.OUT_OF_BOUNDS,
                pulse_interval_ms=600,
                pulse_intensity=0.8,
                vibration_pattern="dull_buzz",
                audio_hint=direction_hint
            )
        else:
            # Approaching center: Geiger counter effect
            # Scale interval from 1200ms (at 0.35 dist) down to 200ms (at 0.05 dist)
            normalized_progress = (OUT_OF_BOUNDS_THRESHOLD - dist) / (OUT_OF_BOUNDS_THRESHOLD - ALIGNMENT_THRESHOLD)
            normalized_progress = max(0.0, min(1.0, normalized_progress))

            interval = int(1200 - (1000 * normalized_progress))
            intensity = round(0.3 + (0.6 * normalized_progress), 2)

            return HapticFeedbackDirective(
                state=HapticState.APPROACHING_CENTER,
                pulse_interval_ms=interval,
                pulse_intensity=intensity,
                vibration_pattern="geiger_rapid",
                audio_hint="Approaching center, hold steady."
            )
