import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface PhoneBadgeOptions {
  persist?: boolean;
  durationMs?: number;
}

export function phoneBadge(options: PhoneBadgeOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  store.setPhoneBadge({
    visible: true,
    persisted: options.persist ?? true,
  });

  if (reduced) return Promise.resolve();

  return new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(options.durationMs ?? 600));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function removePhoneBadge(): void {
  useFxStore.getState().setPhoneBadge(null);
}
