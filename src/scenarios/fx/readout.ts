import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface ReadoutOptions {
  persist?: boolean;
  animateCount?: boolean; // animate countdown e.g. 28 -> 8
}

export function readout(
  slot: number,
  cm: number,
  tone: 'green' | 'red',
  options: ReadoutOptions = {}
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setReadout({
      slot,
      cm,
      tone,
      visible: true,
      persisted: options.persist ?? true,
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const existing = store.readouts[slot];
    const shouldAnimate = options.animateCount && existing && existing.cm !== cm;

    if (shouldAnimate) {
      const fromCm = existing.cm;
      const toCm = cm;
      const steps = 8;
      const stepDuration = t(40);
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const currentCm = Math.round(fromCm + ((toCm - fromCm) * currentStep) / steps);
        store.setReadout({
          slot,
          cm: currentCm,
          tone,
          visible: true,
          persisted: options.persist ?? true,
        });

        if (currentStep >= steps) {
          clearInterval(interval);
          unregister();
          resolve();
        }
      }, stepDuration);

      const unregister = registerCancelHandler(() => {
        clearInterval(interval);
        resolve();
      });
    } else {
      store.setReadout({
        slot,
        cm,
        tone,
        visible: true,
        persisted: options.persist ?? true,
      });

      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(150));

      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    }
  });
}
