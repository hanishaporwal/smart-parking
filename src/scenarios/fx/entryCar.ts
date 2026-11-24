import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface EntryCarOptions {
  startX?: number;
  stopX?: number;
  durationMs?: number;
}

const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: (time: number) => void) => (setTimeout(() => cb(Date.now()), 16) as unknown as number);

const caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

export function entryCar(options: EntryCarOptions = {}): Promise<void> {
  return entryCar.slideIn(options);
}

entryCar.slideIn = (options: EntryCarOptions = {}): Promise<void> => {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  const startX = options.startX ?? -60;
  const stopX = options.stopX ?? 195;
  const aisleY = 295;
  const durationMs = options.durationMs ?? 800;

  store.setDriverCarState({
    visible: true,
    x: startX,
    y: aisleY,
    rotation: 180, // facing right
    headlights: true,
    brakeLights: false,
  });

  if (reduced) {
    store.setDriverCarState({
      visible: true,
      x: stopX,
      y: aisleY,
      rotation: 180,
      headlights: true,
      brakeLights: false,
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const scaledDuration = t(durationMs);
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let animationFrameId: number;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / scaledDuration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentX = startX + (stopX - startX) * ease;

      store.setDriverCarState({
        visible: true,
        x: currentX,
        y: aisleY,
        rotation: 180,
        headlights: true,
        brakeLights: false,
      });

      if (progress < 1) {
        animationFrameId = raf(tick);
      } else {
        unregister();
        resolve();
      }
    };

    animationFrameId = raf(tick);

    const unregister = registerCancelHandler(() => {
      caf(animationFrameId);
      store.setDriverCarState({
        visible: true,
        x: stopX,
        y: aisleY,
        rotation: 180,
        headlights: true,
        brakeLights: false,
      });
      resolve();
    });
  });
};

entryCar.remove = (): void => {
  useFxStore.getState().setDriverCarState(null);
};
