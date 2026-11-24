import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface DriverCarEnterOptions {
  stopX?: number;
  durationMs?: number;
}

export interface DriverCarMoveOptions {
  targetX?: number;
  targetY?: number;
  durationMs?: number;
  brakeLights?: boolean;
}

const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: (time: number) => void) => (setTimeout(() => cb(Date.now()), 16) as unknown as number);

const caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

function animatePosition(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number,
  options: {
    rotation?: number;
    headlights?: boolean;
    brakeLights?: boolean;
    headlightFlash?: boolean;
  } = {}
): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setDriverCarState({
      visible: true,
      x: endX,
      y: endY,
      rotation: options.rotation ?? 180,
      headlights: options.headlights ?? true,
      brakeLights: options.brakeLights ?? false,
      headlightFlash: options.headlightFlash ?? false,
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
      // easeOutQuad
      const easeProgress = 1 - (1 - progress) * (1 - progress);

      const currentX = startX + (endX - startX) * easeProgress;
      const currentY = startY + (endY - startY) * easeProgress;

      store.setDriverCarState({
        visible: true,
        x: currentX,
        y: currentY,
        rotation: options.rotation ?? 180,
        headlights: options.headlights ?? true,
        brakeLights: options.brakeLights ?? false,
        headlightFlash: options.headlightFlash ?? false,
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
        x: endX,
        y: endY,
        rotation: options.rotation ?? 180,
        headlights: options.headlights ?? true,
        brakeLights: options.brakeLights ?? false,
        headlightFlash: options.headlightFlash ?? false,
      });
      resolve();
    });
  });
}

export function driverCar(options: DriverCarEnterOptions = {}): Promise<void> {
  return driverCar.enter(options);
}

driverCar.enter = async (options: DriverCarEnterOptions = {}): Promise<void> => {
  const store = useFxStore.getState();
  const startX = 60;
  const startY = 295;
  const stopX = options.stopX ?? 195;
  const durationMs = options.durationMs ?? 700;

  store.setDriverCarState({
    visible: true,
    x: startX,
    y: startY,
    rotation: 180,
    headlights: true,
    brakeLights: false,
  });

  await animatePosition(startX, startY, stopX, startY, durationMs, {
    rotation: 180,
    headlights: true,
    brakeLights: false,
  });
};

driverCar.followTo = async (
  targetX = 460,
  targetY = 295,
  durationMs = 1100
): Promise<void> => {
  const store = useFxStore.getState();
  const current = store.driverCarState ?? { x: 195, y: 295, rotation: 180 };

  await animatePosition(current.x, current.y, targetX, targetY, durationMs, {
    rotation: 180,
    headlights: true,
    brakeLights: false,
  });
};

driverCar.brake = (durationMs = 300): Promise<void> => {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();
  const current = store.driverCarState ?? {
    visible: true,
    x: 460,
    y: 295,
    rotation: 180,
    headlights: true,
  };

  store.setDriverCarState({
    ...current,
    brakeLights: true,
  });

  if (reduced) return Promise.resolve();

  return new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      unregister();
      resolve();
    }, t(durationMs));

    const unregister = registerCancelHandler(() => {
      clearTimeout(timer);
      resolve();
    });
  });
};

driverCar.flashHeadlights = async (count = 2, flashDurationMs = 120): Promise<void> => {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) return;

  for (let i = 0; i < count; i++) {
    const current = store.driverCarState;
    if (current) {
      store.setDriverCarState({ ...current, headlightFlash: true });
    }
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(flashDurationMs));
      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    const current2 = store.driverCarState;
    if (current2) {
      store.setDriverCarState({ ...current2, headlightFlash: false });
    }
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(flashDurationMs * 0.75));
      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
};

driverCar.driveTo = async (
  targetX = 760,
  targetY = 295,
  durationMs = 1200
): Promise<void> => {
  const store = useFxStore.getState();
  const current = store.driverCarState ?? { x: 460, y: 295, rotation: 180 };

  await animatePosition(current.x, current.y, targetX, targetY, durationMs, {
    rotation: 180,
    headlights: true,
    brakeLights: false,
  });
};

driverCar.remove = (): void => {
  useFxStore.getState().setDriverCarState(null);
};
