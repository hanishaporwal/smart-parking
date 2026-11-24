import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface PathGhostOptions {
  targetSlot?: number; // default 6 (S7)
  lane?: number; // default 1
  drawDurationMs?: number;
  fadeDurationMs?: number;
}

const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: (time: number) => void) => (setTimeout(() => cb(Date.now()), 16) as unknown as number);

const caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

export function pathGhost(options: PathGhostOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  const lane = options.lane ?? 1;
  const targetSlot = options.targetSlot ?? 6;

  if (reduced) {
    store.setPathGhost({
      visible: true,
      lane,
      targetSlot,
      progress: 1,
      opacity: 0,
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const drawMs = t(options.drawDurationMs ?? 600);
    const fadeMs = t(options.fadeDurationMs ?? 700);
    const totalMs = drawMs + fadeMs;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let animationFrameId: number;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed < drawMs) {
        // Phase 1: Draw in path
        const p = elapsed / drawMs;
        store.setPathGhost({
          visible: true,
          lane,
          targetSlot,
          progress: Math.min(1, p),
          opacity: 0.9,
        });
        animationFrameId = raf(tick);
      } else if (elapsed < totalMs) {
        // Phase 2: Fade out
        const fadeP = (elapsed - drawMs) / fadeMs;
        store.setPathGhost({
          visible: true,
          lane,
          targetSlot,
          progress: 1,
          opacity: Math.max(0, 0.9 * (1 - fadeP)),
        });
        animationFrameId = raf(tick);
      } else {
        store.setPathGhost(null);
        unregister();
        resolve();
      }
    };

    animationFrameId = raf(tick);

    const unregister = registerCancelHandler(() => {
      caf(animationFrameId);
      store.setPathGhost(null);
      resolve();
    });
  });
}
