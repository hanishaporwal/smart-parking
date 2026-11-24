import { ChipAnchor } from './types';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface ChipOptions {
  id?: string;
  icon?: string;
  persist?: boolean;
  durationMs?: number;
}

export function chip(
  anchor: ChipAnchor,
  text: string,
  icon?: string,
  options: ChipOptions = {}
): Promise<void> {
  const store = useFxStore.getState();
  const id = options.id ?? `chip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const reduced = isReducedMotion();

  store.addChip({
    id,
    anchor,
    text,
    icon: icon ?? options.icon,
    visible: true,
    persisted: options.persist ?? false,
  });

  if (options.durationMs) {
    const dismissTimer = setTimeout(() => {
      useFxStore.getState().removeChip(id);
    }, t(options.durationMs));
    registerCancelHandler(() => clearTimeout(dismissTimer));
  }

  if (reduced) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    // Reveal duration
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(200));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
