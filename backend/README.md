# AccessibleKYC (EquiSign) — Backend AI Service

Adaptive, accessibility-first identity verification API built with **FastAPI**.

## Core Capabilities
* **Kalman Tremor Stabilization:** Real-time multi-point 3D landmark smoothing to counteract tremors (Parkinson's, essential tremor, shaky hands).
* **Tactile Haptic Radar Directive Generator:** Calculates face-centering offset vectors and maps them into native vibration cadence:
  * `SEARCHING`: Face not yet detected.
  * `APPROACHING_CENTER`: Geiger-counter pulses that accelerate in frequency as alignment improves.
  * `OUT_OF_BOUNDS`: Dull buzz signaling the user to adjust phone tilt.
  * `ALIGNED_READY`: Double-tap confirming frame capture.
* **Passive Anti-Spoofing (No Robotic Gymnastics):** Analyzes 3D depth and temporal micro-drift across consecutive frames without forcing blinks or head turns.
* **Biometric Vector Matching:** Compares selfie vs. ID card embeddings (InsightFace/ArcFace compatible).

---

## Quickstart

### 1. Local Environment Setup
```bash
# Inside the backend directory
python -m venv venv
.\venv\Scripts\activate   # On Windows
source venv/bin/activate  # On macOS/Linux

pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser for the Swagger interactive API documentation.

### 3. Run the Automated Tests
```bash
pytest tests/ -v
```

---

## API Reference

### Health Check
* `GET /health`

### Tremor Stabilization & Haptics
* `POST /api/v1/stabilize-landmarks`
  * Body: `{"stream_id": "session_123", "landmarks": [{"x": 0.5, "y": 0.5, "z": 0.0}, ...]}`
  * Returns: `stabilized_landmarks`, `jitter_detected`, `smoothed_centroid`, `haptic_directive`.

### Tremor Simulation (For Split-Screen Demo)
* `POST /api/v1/simulate-tremor`
  * Body: `{"landmarks": [...], "tremor_frequency_hz": 6.0, "tremor_amplitude": 0.035, "num_frames": 30}`

### End-to-End Verification
* `POST /api/v1/verify`
  * Body: `{"session_id": "session_123", "landmark_stream": [...]}`
  * Returns: `verified: bool`, `liveness_score`, `face_match_score`, `elapsed_ms`, `haptic_result`.
