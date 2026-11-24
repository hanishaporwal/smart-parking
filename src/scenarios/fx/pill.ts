import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function pill(
  slot: number,
  state: 'VACANT' | 'OCCUPIED' | 'TARGET'
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setPillOverride({
      slot,
      state,
      isFlipping: false,
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    store.setPillOverride({
      slot,
      state,
      isFlipping: true,
    });

    const timer = setTimeout(() => {
      store.setPillOverride({
        slot,
        state,
        isFlipping: false,
      });
      unregister();
      resolve();
    }, t(250));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      store.setPillOverride({
        slot,
        state,
        isFlipping: false,
      });
      resolve();
    });
  });
}
