import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function targetRing(slots: number | number[]): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();
  const slotList = Array.isArray(slots) ? slots : [slots];

  store.setTargetRings({
    slots: slotList,
    pulsing: true,
  });

  if (reduced) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    // 500 ms draw-in duration
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(500));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function clearTargetRings(): void {
  useFxStore.getState().setTargetRings(null);
}

targetRing.clear = clearTargetRings;
