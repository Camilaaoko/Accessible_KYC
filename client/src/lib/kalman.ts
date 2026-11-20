export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 1D Kalman filter for continuous coordinate smoothing
 */
export class Kalman1D {
  private x: number = 0; // State estimate
  private p: number = 1.0; // Estimate error covariance
  private q: number; // Process noise covariance
  private r: number; // Measurement noise covariance
  private initialized: boolean = false;

  constructor(q = 0.005, r = 0.05) {
    this.q = q;
    this.r = r;
  }

  update(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return this.x;
    }

    // Prediction
    const pPred = this.p + this.q;

    // Measurement update (Kalman Gain)
    const k = pPred / (pPred + this.r);
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * pPred;

    return this.x;
  }

  reset() {
    this.initialized = false;
    this.p = 1.0;
  }
}

/**
 * Real-time 3D landmark stream tremor dampener
 */
export class ClientKalmanDampener {
  private filters: Map<number, { x: Kalman1D; y: Kalman1D; z: Kalman1D }> = new Map();
  private prevCentroid: Point3D | null = null;
  private q: number;
  private r: number;

  constructor(q = 0.005, r = 0.05) {
    this.q = q;
    this.r = r;
  }

  setNoiseParameters(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.reset();
  }

  stabilize(landmarks: Point3D[]): {
    stabilized: Point3D[];
    jitterMagnitude: number;
    centroid: Point3D;
  } {
    const stabilized: Point3D[] = [];
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    landmarks.forEach((pt, i) => {
      let filter = this.filters.get(i);
      if (!filter) {
        filter = {
          x: new Kalman1D(this.q, this.r),
          y: new Kalman1D(this.q, this.r),
          z: new Kalman1D(this.q, this.r),
        };
        this.filters.set(i, filter);
      }

      const sx = filter.x.update(pt.x);
      const sy = filter.y.update(pt.y);
      const sz = filter.z.update(pt.z);

      stabilized.push({ x: sx, y: sy, z: sz });
      sumX += sx;
      sumY += sy;
      sumZ += sz;
    });

    const n = landmarks.length || 1;
    const currentCentroid: Point3D = {
      x: sumX / n,
      y: sumY / n,
      z: sumZ / n,
    };

    let jitterMagnitude = 0;
    if (this.prevCentroid) {
      // Calculate jitter magnitude as distance between consecutive raw landmark vs previous
      let rawSumDist = 0;
      landmarks.forEach((pt, i) => {
        const stabPt = stabilized[i];
        const dx = pt.x - stabPt.x;
        const dy = pt.y - stabPt.y;
        rawSumDist += Math.sqrt(dx * dx + dy * dy);
      });
      jitterMagnitude = rawSumDist / n;
    }

    this.prevCentroid = currentCentroid;

    return {
      stabilized,
      jitterMagnitude,
      centroid: currentCentroid,
    };
  }

  reset() {
    this.filters.clear();
    this.prevCentroid = null;
  }
}
