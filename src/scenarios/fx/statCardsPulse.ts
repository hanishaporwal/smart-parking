import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function statCardsPulse(): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  store.triggerStatPulse();

  if (reduced) return Promise.resolve();

  return new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(600));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
