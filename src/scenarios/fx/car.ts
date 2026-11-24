import { useScenarioStore } from '../useScenarioStore';
import { useSimStore } from '@/store';
import { registerCancelHandler, useFxStore } from './store';
import { t, isReducedMotion } from '../pacing';

export interface CarArriveOptions {
  distance?: number;
  stagger?: number;
  onCrossThreshold?: (slot: number) => void;
}

export interface ReverseIntoOptions {
  onCrossThreshold?: (slot: number) => void;
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

export const car = {
  arrive: (slot: number | number[], options: CarArriveOptions = {}): Promise<void> => {
    const reduced = isReducedMotion();
    const simStore = useSimStore.getState();
    const targetDist = options.distance ?? 8;
    const slots = Array.isArray(slot) ? slot : [slot];

    if (reduced) {
      slots.forEach(s => {
        simStore.setDistance(s, targetDist);
        options.onCrossThreshold?.(s);
      });
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      let completedCount = 0;
      const timeouts: ReturnType<typeof setTimeout>[] = [];

      const unregister = registerCancelHandler(() => {
        timeouts.forEach(tm => clearTimeout(tm));
        slots.forEach(s => simStore.setDistance(s, targetDist));
        resolve();
      });

      slots.forEach((s, idx) => {
        const staggerDelay = t(idx * (options.stagger ?? 150));

        const startTimer = setTimeout(() => {
          // Trigger car arrival visual in scenario store
          useScenarioStore.setState({ activeCarAnimation: { type: 'arrive', slotIndex: s } });

          // Halfway through arrival (~600ms), car crosses the 15cm threshold
          const thresholdTimer = setTimeout(() => {
            simStore.setDistance(s, targetDist);
            options.onCrossThreshold?.(s);
          }, t(600));
          timeouts.push(thresholdTimer);

          // Full arrival settles at ~1200ms
          const settleTimer = setTimeout(() => {
            completedCount++;
            if (completedCount >= slots.length) {
              unregister();
              resolve();
            }
          }, t(1200));
          timeouts.push(settleTimer);
        }, staggerDelay);
        timeouts.push(startTimer);
      });
    });
  },

  leave: (
    slot: number,
    options: { onCrossThreshold?: (slot: number) => void } = {}
  ): Promise<void> => {
    const reduced = isReducedMotion();
    const simStore = useSimStore.getState();

    if (reduced) {
      simStore.setDistance(slot, 28);
      options.onCrossThreshold?.(slot);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      useScenarioStore.setState({ activeCarAnimation: { type: 'leave', slotIndex: slot } });

      const thresholdTimer = setTimeout(() => {
        simStore.setDistance(slot, 28);
        options.onCrossThreshold?.(slot);
      }, t(500));

      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(1200));

      const unregister = registerCancelHandler(() => {
        clearTimeout(thresholdTimer);
        clearTimeout(timer);
        simStore.setDistance(slot, 28);
        options.onCrossThreshold?.(slot);
        resolve();
      });
    });
  },

  enter: (): Promise<void> => {
    const reduced = isReducedMotion();
    useScenarioStore.setState({ gateCarState: 'atGate' });
    if (reduced) return Promise.resolve();

    return new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(800));

      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  },

  driveTo: (_point: { x: number; y: number }): Promise<void> => {
    const reduced = isReducedMotion();
    useScenarioStore.setState({ gateCarState: 'followingRoute' });
    if (reduced) return Promise.resolve();

    return new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        unregister();
        resolve();
      }, t(1800));

      const unregister = registerCancelHandler(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  },

  reverseInto: (slot: number, options: ReverseIntoOptions = {}): Promise<void> => {
    const reduced = isReducedMotion();
    const simStore = useSimStore.getState();
    const fxStore = useFxStore.getState();

    if (reduced) {
      options.onCrossThreshold?.(slot);
      simStore.setDistance(slot, 8);
      useScenarioStore.setState({ gateCarState: 'none' });
      useFxStore.getState().setDriverCarState(null);
      return Promise.resolve();
    }

    const currentCar = fxStore.driverCarState;
    if (!currentCar) {
      return new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          options.onCrossThreshold?.(slot);
          simStore.setDistance(slot, 8);
          useScenarioStore.setState({ gateCarState: 'none' });
          unregister();
          resolve();
        }, t(options.durationMs ?? 1000));

        const unregister = registerCancelHandler(() => {
          clearTimeout(timer);
          options.onCrossThreshold?.(slot);
          simStore.setDistance(slot, 8);
          useScenarioStore.setState({ gateCarState: 'none' });
          resolve();
        });
      });
    }

    // 3-point maneuver: pull slightly past slot, then reverse rear-first into bay
    const targetBayX = 324 + (slot % 4) * 190 + 95;
    const isUpper = slot < 4;
    const targetBayY = isUpper ? 116 : 474;
    const startX = currentCar.x;
    const startY = currentCar.y;
    const pullPastX = targetBayX + 26;

    return new Promise<void>(resolve => {
      const scaledDuration = t(options.durationMs ?? 1100);
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      let animationFrameId: number;
      let thresholdTriggered = false;

      const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / scaledDuration);

        // First 25% of time: pull slightly past
        if (progress < 0.25) {
          const p = progress / 0.25;
          const curX = startX + (pullPastX - startX) * p;
          fxStore.setDriverCarState({
            ...currentCar,
            visible: true,
            x: curX,
            y: startY,
            rotation: 180,
            brakeLights: false,
            isReversing: false,
          });
        } else {
          // Remaining 75%: reverse rear-first into bay
          const revP = (progress - 0.25) / 0.75;
          // smooth easeInOutQuad
          const ease = revP < 0.5 ? 2 * revP * revP : 1 - Math.pow(-2 * revP + 2, 2) / 2;
          const curX = pullPastX + (targetBayX - pullPastX) * ease;
          const curY = startY + (targetBayY - startY) * ease;
          // Rotate into bay facing aisle (180 -> 270 for lower, 180 -> 90 for upper)
          const targetRot = isUpper ? 90 : 270;
          const curRot = 180 + (targetRot - 180) * ease;

          fxStore.setDriverCarState({
            ...currentCar,
            visible: true,
            x: curX,
            y: curY,
            rotation: curRot,
            brakeLights: false,
            isReversing: true,
          });

          // Halfway through reverse (~15cm threshold crossing)
          if (!thresholdTriggered && revP >= 0.45) {
            thresholdTriggered = true;
            options.onCrossThreshold?.(slot);
            simStore.setDistance(slot, 8);
          }
        }

        if (progress < 1) {
          animationFrameId = raf(tick);
        } else {
          unregister();
          if (!thresholdTriggered) {
            options.onCrossThreshold?.(slot);
            simStore.setDistance(slot, 8);
          }
          useFxStore.getState().setDriverCarState(null);
          useScenarioStore.setState({ gateCarState: 'none' });
          resolve();
        }
      };

      animationFrameId = raf(tick);

      const unregister = registerCancelHandler(() => {
        caf(animationFrameId);
        options.onCrossThreshold?.(slot);
        simStore.setDistance(slot, 8);
        useFxStore.getState().setDriverCarState(null);
        useScenarioStore.setState({ gateCarState: 'none' });
        resolve();
      });
    });
  },
};
