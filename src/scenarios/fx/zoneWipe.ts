import { RgbColor, COLOR_RED, COLOR_GREEN } from '@/engine';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export type ZoneWipeColor = RgbColor | 'red' | 'green' | 'gold' | 'off';

export function zoneWipe(
  strip: number,
  fromPx: number,
  toPx: number,
  colour: ZoneWipeColor,
  msPerPx = 8
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  // Normalize strip index: strip 2 -> 1 (Lane 1); strip 1 with px 25..49 (S2) -> 0 (Lane 0)
  const stripIdx: 0 | 1 = strip === 2 ? 1 : 0;

  let rgb: RgbColor;
  if (typeof colour === 'string') {
    if (colour === 'red') rgb = COLOR_RED;
    else if (colour === 'green') rgb = COLOR_GREEN;
    else if (colour === 'gold') rgb = { r: 224, g: 168, b: 75 };
    else rgb = { r: 0, g: 0, b: 0 };
  } else {
    rgb = colour;
  }

  if (reduced) {
    store.setCustomLedPixels(stripIdx, fromPx, toPx, rgb);
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    let curPx = fromPx;
    const direction = toPx >= fromPx ? 1 : -1;
    const stepIntervalMs = t(msPerPx);

    const interval = setInterval(() => {
      store.setCustomLedPixels(stripIdx, curPx, curPx, rgb);
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
      store.setCustomLedPixels(stripIdx, fromPx, toPx, rgb);
      resolve();
    });
  });
}
