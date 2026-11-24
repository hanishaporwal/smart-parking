import { SlotOrAll, SonarOptions } from './types';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function sonar(slotOrAll: SlotOrAll, options: SonarOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();
  const staggerMs = options.stagger ?? 0;
  const baseDuration = options.duration ?? 900;
  const durationMs = reduced ? 0 : t(baseDuration);
  const tone = options.tone ?? 'info';

  const slots: number[] =
    slotOrAll === 'all'
      ? [0, 1, 2, 3, 4, 5, 6, 7]
      : Array.isArray(slotOrAll)
      ? slotOrAll
      : [slotOrAll];

  if (reduced || slots.length === 0) {
    store.setSensorGlows(slots);
    slots.forEach(s => options.onPulseReturn?.(s));
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    let completedCount = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Glow rims for all involved sensors
    store.setSensorGlows(slots);

    const cleanup = () => {
      timeouts.forEach(tm => clearTimeout(tm));
      slots.forEach(s => store.removeSonar(s));
    };

    const unregister = registerCancelHandler(() => {
      cleanup();
      resolve();
    });

    slots.forEach((slot, idx) => {
      const delay = t(idx * staggerMs);
      const startTimer = setTimeout(() => {
        store.addSonar({
          slot,
          tone,
          key: Date.now() + idx,
          duration: durationMs,
        });

        const endTimer = setTimeout(() => {
          store.removeSonar(slot);
          options.onPulseReturn?.(slot);
          completedCount++;
          if (completedCount >= slots.length) {
            unregister();
            resolve();
          }
        }, durationMs);
        timeouts.push(endTimer);
      }, delay);
      timeouts.push(startTimer);
    });
  });
}
