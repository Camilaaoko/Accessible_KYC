export type HapticPattern = "heartbeat" | "geiger_rapid" | "dull_buzz" | "double_tap";

export interface HapticStateDetail {
  pattern: HapticPattern;
  intervalMs: number;
  intensity: number;
  label: string;
}

export class HapticRadarService {
  private lastTriggerTime: number = 0;
  private currentPattern: HapticPattern = "heartbeat";
  private isVibrating: boolean = false;
  private listeners: Set<(state: HapticStateDetail) => void> = new Set();

  subscribe(callback: (state: HapticStateDetail) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(state: HapticStateDetail) {
    this.listeners.forEach((cb) => cb(state));
  }

  triggerPattern(pattern: HapticPattern, intervalMs = 600, intensity = 0.5) {
    const now = Date.now();
    this.currentPattern = pattern;

    let label = "Heartbeat Search Pulse";
    if (pattern === "geiger_rapid") label = "Approaching Center (Rapid Geiger)";
    if (pattern === "dull_buzz") label = "Drifting Out of Bounds (Buzz)";
    if (pattern === "double_tap") label = "Target Captured (Double Tap)";

    this.notify({
      pattern,
      intervalMs,
      intensity,
      label,
    });

    if (now - this.lastTriggerTime < intervalMs * 0.75) {
      return;
    }
    this.lastTriggerTime = now;

    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      try {
        switch (pattern) {
          case "heartbeat":
            navigator.vibrate([40, 100, 40]);
            break;
          case "geiger_rapid":
            navigator.vibrate(30);
            break;
          case "dull_buzz":
            navigator.vibrate(180);
            break;
          case "double_tap":
            navigator.vibrate([80, 60, 120]);
            break;
        }
      } catch {
        // Ignore browser vibration security restrictions
      }
    }
  }
}

export const hapticRadarService = new HapticRadarService();
