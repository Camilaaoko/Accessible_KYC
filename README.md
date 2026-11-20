# AccessibleKYC (EquiSign)

> **Making digital identity verification human, dignified, and universally accessible through adaptive vision, tremor stabilization, and tactile haptic radar.**

Based on the [AccessibleKYC Project Blueprint](ACCESSIBLE_KYC.md).

---

## Repository Structure

* **[`backend/`](backend/)**: Python FastAPI AI service
  * **Kalman Filter Tremor Dampener**: Smooths high-frequency coordinate fluctuations caused by tremors or unsteady hands.
  * **Tactile Haptic Radar Directive Generator**: Maps face-centering vectors to native smartphone vibration patterns.
  * **Passive Anti-Spoofing Engine**: Validates liveness without requiring robotic gymnastics (no forced blinking or head turns).
  * **Biometric Face Matcher**: InsightFace/ArcFace compatible embedding matcher against ID photos.
* **[`client/`](client/)**: Next.js 14 Web Client & Hackathon Interactive Demo (Split-screen tremor demo, Web Audio pitch radar, haptics, and WCAG AAA mode).
* **[`ACCESSIBLE_KYC.md`](ACCESSIBLE_KYC.md)**: Full project blueprint, architecture specifications, and hackathon presentation plan.

---

## Quickstart

### 1. Launch the Frontend Demo
```bash
cd client
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. (Optional) Run the Backend AI Core
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate (macOS/Linux)

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

Run tests:
```bash
pytest backend/tests/ -v
```
