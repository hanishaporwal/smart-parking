import { useFxStore, registerCancelHandler } from './store';
import { useSimStore } from '@/store';
import { t, isReducedMotion } from '../pacing';

export interface IntruderCarOptions {
  slot?: number; // default 1 (S2)
  onCrossThreshold?: (slot: number) => void;
  driveDurationMs?: number;
  reverseDurationMs?: number;
}

const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: (time: number) => void) => (setTimeout(() => cb(Date.now()), 16) as unknown as number);

const caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

export function intruderCar(options: IntruderCarOptions = {}): Promise<void> {
  return intruderCar.enterAndPark(options.slot ?? 1, options);
}

intruderCar.enterAndPark = async (
  slot = 1,
  options: IntruderCarOptions = {}
): Promise<void> => {
  const store = useFxStore.getState();
  const simStore = useSimStore.getState();
  const reduced = isReducedMotion();

  const startX = 1060;
  const aisleY = 295;
  // S2 center X = 609; S2 center Y = 116
  const targetBayX = 324 + (slot % 4) * 190 + 95;
  const targetBayY = 116;

  if (reduced) {
    options.onCrossThreshold?.(slot);
    simStore.setDistance(slot, 8);
    store.setIntruderCarState(null);
    return Promise.resolve();
  }

  // Phase 1: Drive left along aisle to in front of target bay
  await new Promise<void>(resolve => {
    store.setIntruderCarState({
      visible: true,
      x: startX,
      y: aisleY,
      rotation: 0, // facing left
      isReversing: false,
    });

    const scaledDuration = t(options.driveDurationMs ?? 750);
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let animationFrameId: number;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / scaledDuration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const curX = startX + (targetBayX + 30 - startX) * ease;

      store.setIntruderCarState({
        visible: true,
        x: curX,
        y: aisleY,
        rotation: 0,
        isReversing: false,
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
      store.setIntruderCarState({
        visible: true,
        x: targetBayX + 30,
        y: aisleY,
        rotation: 0,
        isReversing: false,
      });
      resolve();
    });
  });

  // Phase 2: Reverse into bay S2 with white reverse lights
  await new Promise<void>(resolve => {
    const scaledDuration = t(options.reverseDurationMs ?? 850);
    const startReverseX = targetBayX + 30;
    const startReverseY = aisleY;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let animationFrameId: number;
    let thresholdTriggered = false;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / scaledDuration);
      // smooth easeInOutQuad
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const curX = startReverseX + (targetBayX - startReverseX) * ease;
      const curY = startReverseY + (targetBayY - startReverseY) * ease;
      // Rotation curves into vertical parking orientation (0 -> 90)
      const curRot = 0 + 90 * ease;

      store.setIntruderCarState({
        visible: true,
        x: curX,
        y: curY,
        rotation: curRot,
        isReversing: true,
      });

      // Halfway through reverse (~15cm threshold crossing)
      if (!thresholdTriggered && progress >= 0.45) {
        thresholdTriggered = true;
        options.onCrossThreshold?.(slot);
        simStore.setDistance(slot, 8);
      }

      if (progress < 1) {
        animationFrameId = raf(tick);
      } else {
        unregister();
        // Handover to standard parked car of S2
        if (!thresholdTriggered) {
          options.onCrossThreshold?.(slot);
          simStore.setDistance(slot, 8);
        }
        store.setIntruderCarState(null);
        resolve();
      }
    };

    animationFrameId = raf(tick);

    const unregister = registerCancelHandler(() => {
      caf(animationFrameId);
      options.onCrossThreshold?.(slot);
      simStore.setDistance(slot, 8);
      store.setIntruderCarState(null);
      resolve();
    });
  });
};

intruderCar.remove = (): void => {
  useFxStore.getState().setIntruderCarState(null);
};
