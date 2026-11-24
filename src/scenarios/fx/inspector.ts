// ============================================================================
// PARKWAY SENSOR S3 INSPECTOR (src/scenarios/fx/inspector.ts)
// Manages the state and animation choreography for the detailed internal view
// of sensor S3 (echo timer, vertical ruler, threshold line, pulse waves, car).
// ============================================================================

import { create } from 'zustand';
import { t, isReducedMotion } from '../pacing';

export interface InspectorState {
  visible: boolean;
  pulseDirection: 'none' | 'down' | 'up';
  pulseProgress: number; // 0..1
  echoTimerUs: number; // 0..2000
  timerTimeout: boolean;
  carVisible: boolean;
  carCm: number;
  carProgress: number; // 0..1
  triggerFlash: boolean;
  rulerMarkerCm: number;
  floorVisible: boolean;
  thresholdPulse: boolean;
  formula: { us: number; cm: number } | null;
  readoutCm: number | null;
  readoutTone: 'green' | 'red';
  pill: 'VACANT' | 'OCCUPIED' | null;
  noteChip: string | null;
  tag: string | null;

  // Actions
  setVisible: (visible: boolean) => void;
  setPulse: (dir: 'none' | 'down' | 'up', progress: number) => void;
  setEchoTimer: (us: number, timeout?: boolean) => void;
  setCar: (visible: boolean, cm: number, progress?: number) => void;
  setTriggerFlash: (flash: boolean) => void;
  setThresholdPulse: (pulse: boolean) => void;
  setRulerMarker: (cm: number) => void;
  setFloorVisible: (visible: boolean) => void;
  setFormula: (formula: { us: number; cm: number } | null) => void;
  setReadout: (cm: number | null, tone?: 'green' | 'red') => void;
  setPill: (pill: 'VACANT' | 'OCCUPIED' | null) => void;
  setNoteChip: (note: string | null) => void;
  setTag: (tag: string | null) => void;
  reset: () => void;
}

export const useInspectorStore = create<InspectorState>((set) => ({
  visible: false,
  pulseDirection: 'none',
  pulseProgress: 0,
  echoTimerUs: 0,
  timerTimeout: false,
  carVisible: false,
  carCm: 28,
  carProgress: 0,
  triggerFlash: false,
  rulerMarkerCm: 28,
  floorVisible: true,
  thresholdPulse: false,
  formula: null,
  readoutCm: null,
  readoutTone: 'green',
  pill: null,
  noteChip: null,
  tag: null,

  setVisible: (visible) => set({ visible }),
  setPulse: (pulseDirection, pulseProgress) => set({ pulseDirection, pulseProgress }),
  setEchoTimer: (echoTimerUs, timerTimeout = false) => set({ echoTimerUs, timerTimeout }),
  setCar: (carVisible, carCm, carProgress = 1) => set({ carVisible, carCm, carProgress }),
  setTriggerFlash: (triggerFlash) => set({ triggerFlash }),
  setThresholdPulse: (thresholdPulse) => set({ thresholdPulse }),
  setRulerMarker: (rulerMarkerCm) => set({ rulerMarkerCm }),
  setFloorVisible: (floorVisible) => set({ floorVisible }),
  setFormula: (formula) => set({ formula }),
  setReadout: (readoutCm, readoutTone = 'green') => set({ readoutCm, readoutTone }),
  setPill: (pill) => set({ pill }),
  setNoteChip: (noteChip) => set({ noteChip }),
  setTag: (tag) => set({ tag }),
  reset: () =>
    set({
      visible: false,
      pulseDirection: 'none',
      pulseProgress: 0,
      echoTimerUs: 0,
      timerTimeout: false,
      carVisible: false,
      carCm: 28,
      carProgress: 0,
      triggerFlash: false,
      rulerMarkerCm: 28,
      floorVisible: true,
      thresholdPulse: false,
      formula: null,
      readoutCm: null,
      readoutTone: 'green',
      pill: null,
      noteChip: null,
      tag: null,
    }),
}));

/**
 * inspector(): opens the inside-sensor-S3 glass panel with a spring (500 ms)
 */
export function openInspector(): Promise<void> {
  const store = useInspectorStore.getState();
  store.setVisible(true);
  store.setFloorVisible(true);
  if (isReducedMotion()) return Promise.resolve();

  return new Promise((resolve) => setTimeout(resolve, t(500)));
}

/**
 * Closes the inspector panel
 */
export function closeInspector(): Promise<void> {
  useInspectorStore.getState().setVisible(false);
  if (isReducedMotion()) return Promise.resolve();

  return new Promise((resolve) => setTimeout(resolve, t(500)));
}

/**
 * 10 us trigger chip flashes on the sensor
 */
export function flashTrigger(): Promise<void> {
  const store = useInspectorStore.getState();
  store.setTriggerFlash(true);

  return new Promise((resolve) => {
    setTimeout(() => {
      store.setTriggerFlash(false);
      resolve();
    }, t(350));
  });
}

/**
 * pulseWave(direction): three info-blue arcs travelling down or up,
 * filling the echo timer smoothly as it travels.
 */
export function pulseWave(
  direction: 'down' | 'up',
  durationMs = 1500,
  targetUs = 1633
): Promise<void> {
  const store = useInspectorStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setPulse('none', 1);
    store.setEchoTimer(targetUs);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const duration = t(durationMs);
    const start = performance.now();
    const startUs = direction === 'down' ? 0 : store.echoTimerUs;
    const endUs = targetUs;

    store.setPulse(direction, 0);

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);

      store.setPulse(direction, progress);
      const currentUs = Math.round(startUs + (endUs - startUs) * progress);
      store.setEchoTimer(currentUs);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        store.setPulse('none', 1);
        store.setEchoTimer(endUs);
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * sideCar(): rolls into the bay with roof at reading's cm mark
 */
export function sideCarRollIn(targetCm = 8, durationMs = 1200): Promise<void> {
  const store = useInspectorStore.getState();
  const reduced = isReducedMotion();

  store.setCar(true, targetCm, reduced ? 1 : 0);

  if (reduced) {
    store.setRulerMarker(targetCm);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const duration = t(durationMs);
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);

      store.setCar(true, targetCm, progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        store.setCar(true, targetCm, 1);
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * sideCar rolls out of the bay
 */
export function sideCarRollOut(durationMs = 1000): Promise<void> {
  const store = useInspectorStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setCar(false, 28, 0);
    store.setFloorVisible(false);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const duration = t(durationMs);
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);

      store.setCar(true, 8, 1 - progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        store.setCar(false, 28, 0);
        store.setFloorVisible(false);
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * formulaChip(us, cm): updates formula chip with pulsing substitution
 */
export function formulaChip(us: number, cm: number): Promise<void> {
  const store = useInspectorStore.getState();
  store.setFormula({ us, cm });
  return Promise.resolve();
}
