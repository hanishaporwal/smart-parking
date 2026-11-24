import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface HaloOptions {
  stagger?: number; // default 150
  persist?: boolean;
}

export function haloCandidates(slots: number[], options: HaloOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setCandidateHalos(slots, options.persist);
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const staggerMs = t(options.stagger ?? 150);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const unregister = registerCancelHandler(() => {
      timeouts.forEach(tm => clearTimeout(tm));
      resolve();
    });

    slots.forEach((s, idx) => {
      const tm = setTimeout(() => {
        useFxStore.getState().addCandidateHalo(s);
        if (idx === slots.length - 1) {
          if (options.persist) {
            useFxStore.setState({ candidateHalosPersisted: true });
          }
          unregister();
          resolve();
        }
      }, idx * staggerMs);
      timeouts.push(tm);
    });
  });
}

export function clearCandidateHalos(): void {
  useFxStore.getState().clearCandidateHalos();
}
