import math
import random
from typing import List
from app.schemas.biometrics import Point3D


class TremorSimulator:
    """
    Simulates realistic hand and head tremors (e.g., Parkinson's, Essential Tremor).
    Tremor characteristics:
    - Dominant frequency: typically 4-8 Hz
    - Harmonics and micro-jitter: pseudo-random noise superimposed on sinusoidal wave
    """
    def __init__(self, frequency_hz: float = 6.0, amplitude: float = 0.035):
        self.freq = frequency_hz
        self.amp = amplitude

    def inject_tremor(self, base_landmarks: List[Point3D], frame_index: int, fps: float = 30.0) -> List[Point3D]:
        t = frame_index / max(fps, 1.0)
        # Primary sinusoidal tremor
        omega = 2.0 * math.pi * self.freq * t
        
        # Combined tremor oscillations (x, y horizontal and vertical hand sway)
        sway_x = self.amp * math.sin(omega) + (self.amp * 0.3) * math.sin(omega * 2.3)
        sway_y = self.amp * 0.8 * math.cos(omega * 1.1) + (self.amp * 0.25) * math.sin(omega * 3.1)
        
        # Micro-tremor / muscular noise
        noise_x = (random.random() - 0.5) * (self.amp * 0.4)
        noise_y = (random.random() - 0.5) * (self.amp * 0.4)

        offset_x = sway_x + noise_x
        offset_y = sway_y + noise_y

        shaky_landmarks: List[Point3D] = []
        for pt in base_landmarks:
            shaky_landmarks.append(Point3D(
                x=round(pt.x + offset_x, 6),
                y=round(pt.y + offset_y, 6),
                z=round(pt.z + (offset_x * 0.2), 6)
            ))

        return shaky_landmarks
