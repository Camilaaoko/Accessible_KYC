# AccessibleKYC (EquiSign) — Frontend Web Client & Hackathon Demo

> **Making digital identity verification human, dignified, and accessible through tremor stabilization, sensory haptic radar, and passive anti-spoofing.**

This directory contains the production-ready Next.js 14 frontend application implementing the client layer described in [ACCESSIBLE_KYC.md](../ACCESSIBLE_KYC.md).

---

## Key Features

1. **Hackathon Split-Screen Comparative Demo:**
   * **Left (Legacy Industry Baseline):** Simulates standard commercial KYC (Jumio, Sumsub, Veriff). Demands rigid posture, detects motor tremors/motion blur, stalls progress, and times out with `"Verification Failed: Motion detected"`.
   * **Right (AccessibleKYC):** Passes the shaky camera stream through a real-time Kalman tremor dampener. Verifies passive liveness in **3.4 seconds** with a celebratory checkmark and confidence scores.

2. **The "Eyes-Closed" Tactile & Audio Challenge:**
   * Simulates full non-visual identity verification for blind and low-vision users.
   * **Spatial Pitch Sonification (Web Audio API):** Audio tone pitch rises dynamically from 280 Hz to 750 Hz as the face approaches the optimal center frame.
   * **Tactile Haptic Radar:** Employs the `navigator.vibrate` API and animated visual pulse rings matching device vibration states (`heartbeat`, `geiger_rapid`, `dull_buzz`, `double_tap`).

3. **Complete 3-Step Assistive Onboarding Flow:**
   * Step 1: ID Document capture with OCR verification preview.
   * Step 2: Adaptive biometric selfie without forced blinking or head turns.
   * Step 3: Verified Digital Identity Pass with European Accessibility Act (EAA) and ADA compliance certification.

4. **WCAG AAA Compliance:**
   * One-click AAA High Contrast toggle (Yellow on true black, maximum contrast ratio).
   * Spoken voice guidance fallback via Web Speech Synthesis.
   * Dual visual + auditory + tactile sensory channels.

---

## Quickstart

### 1. Start the Frontend
```bash
cd client
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. (Optional) Run alongside the Backend AI Core
In a separate terminal:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Note: If the backend is not running, the client automatically utilizes its built-in client-side Kalman filter and simulation engine.*
