import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export function routeRetract(durationMs = 500): Promise<void> {
  const store = useFxStore.getState();
  const currentRoute = store.routeOverride;
  const reduced = isReducedMotion();

  if (!currentRoute) return Promise.resolve();

  store.setRouteOverride({
    ...currentRoute,
    retracting: true,
  });

  if (reduced) {
    store.setRouteOverride(null);
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      store.setRouteOverride(null);
      unregister();
      resolve();
    }, t(durationMs));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      store.setRouteOverride(null);
      resolve();
    });
  });
}
