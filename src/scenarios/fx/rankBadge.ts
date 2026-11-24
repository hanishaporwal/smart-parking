import { useFxStore, registerCancelHandler } from './store';
import { isReducedMotion } from '../pacing';

export interface RankBadgeOptions {
  strikeP?: boolean;
  persist?: boolean;
}

export function rankBadge(
  slotOrSlots: number | number[],
  text: string,
  options: RankBadgeOptions = {}
): Promise<void> {
  const store = useFxStore.getState();
  const slots = Array.isArray(slotOrSlots) ? slotOrSlots : [slotOrSlots];
  const reduced = isReducedMotion();

  slots.forEach(s => {
    store.setRankBadge(s, {
      text,
      strikeP: options.strikeP ?? true,
      persisted: options.persist,
    });
  });

  if (reduced) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const tm = setTimeout(() => {
      unregister();
      resolve();
    }, 250);

    const unregister = registerCancelHandler(() => {
      clearTimeout(tm);
      resolve();
    });
  });
}

export function clearRankBadges(): void {
  useFxStore.getState().clearRankBadges();
}
