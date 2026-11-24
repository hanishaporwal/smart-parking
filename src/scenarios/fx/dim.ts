import { useFxStore } from './store';
import { t, isReducedMotion } from '../pacing';

export function dim(slots: number | number[], level = 0.45): Promise<void> {
  const store = useFxStore.getState();
  const slotList = Array.isArray(slots) ? slots : [slots];
  slotList.forEach(s => store.setDimLevel(s, level));
  return Promise.resolve();
}

export function undim(slots?: number | number[], durationMs = 0): Promise<void> {
  const store = useFxStore.getState();
  if (slots === undefined) {
    store.clearAllDim();
  } else {
    const slotList = Array.isArray(slots) ? slots : [slots];
    slotList.forEach(s => store.clearDim(s));
  }

  if (durationMs > 0 && !isReducedMotion()) {
    return new Promise<void>(resolve => setTimeout(resolve, t(durationMs)));
  }
  return Promise.resolve();
}
