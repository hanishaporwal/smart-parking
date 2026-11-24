import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface RouteOptions {
  persist?: boolean;
  cometProgress?: number;
}

export function route(
  lane: number,
  targetSlot: number,
  options: RouteOptions = {}
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  store.setRouteOverride({
    active: true,
    lane,
    targetSlot,
    cometProgress: options.cometProgress ?? 1,
    persisted: options.persist ?? true,
  });

  if (reduced) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    // Route drawing animation completes smoothly
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(300));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
