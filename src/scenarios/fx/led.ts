import { RgbColor } from '@/engine';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface SweepOptions {
  skipOccupied?: boolean;
  onPixel?: (px: number) => void;
}

export function deferSweepVisual(defer: boolean): void {
  useFxStore.getState().setDeferSweepVisual(defer);
}

export function ledFill(
  strip: 0 | 1,
  fromPx: number,
  toPx: number,
  colour: RgbColor,
  msPerPx = 20
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setCustomLedPixels(strip, fromPx, toPx, colour);
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    let curPx = fromPx;
    const direction = toPx >= fromPx ? 1 : -1;
    const stepIntervalMs = t(msPerPx);

    const interval = setInterval(() => {
      store.setCustomLedPixels(strip, curPx, curPx, colour);
      if (curPx === toPx) {
        clearInterval(interval);
        unregister();
        resolve();
      } else {
        curPx += direction;
      }
    }, stepIntervalMs);

    const unregister = registerCancelHandler(() => {
      clearInterval(interval);
      store.setCustomLedPixels(strip, fromPx, toPx, colour);
      resolve();
    });
  });
}

export function sweep(
  strip: 0 | 1,
  toPx: number,
  _options: SweepOptions = {}
): Promise<void> {
  const store = useFxStore.getState();
  const targetSlot = strip * 4 + Math.floor(toPx / 25);
  store.setBlinkingSlot(targetSlot);
  return Promise.resolve();
}
