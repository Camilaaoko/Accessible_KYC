import { Point3D } from "./kalman";

/**
 * Generates an anatomically representative 3D facial landmark mesh
 * normalized between 0.0 and 1.0 (matching MediaPipe Face Mesh coordinates).
 */
export function generateCanonicalFaceLandmarks(
  centerX = 0.5,
  centerY = 0.5,
  scale = 0.28,
  headTilt = 0
): Point3D[] {
  const points: Point3D[] = [];

  // 1. Oval / Jawline perimeter (36 points)
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2 + headTilt;
    const rX = scale * 0.85;
    const rY = scale * 1.15;
    points.push({
      x: centerX + Math.cos(angle) * rX,
      y: centerY + Math.sin(angle) * rY,
      z: -Math.cos(angle) * 0.05,
    });
  }

  // 2. Left Eyebrow & Eye (16 points)
  const leftEyeCenterX = centerX - scale * 0.35;
  const eyeCenterY = centerY - scale * 0.25;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    points.push({
      x: leftEyeCenterX + Math.cos(a) * (scale * 0.14),
      y: eyeCenterY + Math.sin(a) * (scale * 0.07),
      z: 0.02,
    });
  }
  // Left Eyebrow arch
  for (let i = 0; i < 6; i++) {
    const x = leftEyeCenterX - scale * 0.16 + (i / 5) * (scale * 0.32);
    const y = eyeCenterY - scale * 0.12 - Math.sin((i / 5) * Math.PI) * (scale * 0.05);
    points.push({ x, y, z: 0.03 });
  }

  // 3. Right Eyebrow & Eye (16 points)
  const rightEyeCenterX = centerX + scale * 0.35;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    points.push({
      x: rightEyeCenterX + Math.cos(a) * (scale * 0.14),
      y: eyeCenterY + Math.sin(a) * (scale * 0.07),
      z: 0.02,
    });
  }
  // Right Eyebrow arch
  for (let i = 0; i < 6; i++) {
    const x = rightEyeCenterX - scale * 0.16 + (i / 5) * (scale * 0.32);
    const y = eyeCenterY - scale * 0.12 - Math.sin((i / 5) * Math.PI) * (scale * 0.05);
    points.push({ x, y, z: 0.03 });
  }

  // 4. Nose Bridge & Tip (12 points)
  for (let i = 0; i < 6; i++) {
    points.push({
      x: centerX,
      y: eyeCenterY + (i / 5) * (scale * 0.42),
      z: 0.04 + (i / 5) * 0.04,
    });
  }
  // Nose base
  for (let i = -3; i <= 3; i++) {
    points.push({
      x: centerX + (i / 3) * (scale * 0.12),
      y: eyeCenterY + scale * 0.42,
      z: 0.06 - Math.abs(i / 3) * 0.03,
    });
  }

  // 5. Lips Outer & Inner (24 points)
  const mouthCenterY = centerY + scale * 0.52;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(a) * (scale * 0.26),
      y: mouthCenterY + Math.sin(a) * (scale * 0.11),
      z: 0.01,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(a) * (scale * 0.16),
      y: mouthCenterY + Math.sin(a) * (scale * 0.05),
      z: 0.01,
    });
  }

  // 6. Cheekbones & Forehead structural mesh grid (up to 120 key landmarks)
  for (let row = 0; row < 5; row++) {
    for (let col = -3; col <= 3; col++) {
      points.push({
        x: centerX + (col / 3.5) * (scale * 0.7),
        y: centerY - scale * 0.6 + row * (scale * 0.25),
        z: -0.02 + Math.cos(col) * 0.03,
      });
    }
  }

  return points;
}

/**
 * Injects realistic tremor noise across landmark array.
 * Parkinson's resting tremor typically oscillates between 4 Hz and 7 Hz.
 */
export function injectTremorNoise(
  landmarks: Point3D[],
  timeSec: number,
  freqHz = 6.0,
  amplitude = 0.025
): Point3D[] {
  const phase = 2 * Math.PI * freqHz * timeSec;
  // Multi-harmonic tremor with postural jitter
  const dx = amplitude * Math.sin(phase) + 0.35 * amplitude * Math.sin(phase * 2.1) + (Math.random() - 0.5) * 0.003;
  const dy = amplitude * Math.cos(phase * 0.95) + 0.25 * amplitude * Math.cos(phase * 1.8) + (Math.random() - 0.5) * 0.003;

  return landmarks.map((pt) => ({
    x: pt.x + dx,
    y: pt.y + dy,
    z: pt.z,
  }));
}
