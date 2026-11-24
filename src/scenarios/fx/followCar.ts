import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface FollowCarOptions {
  targetSlot?: number; // default 6 (S7)
  durationMs?: number;
  onNodePassed?: (nodeIndex: number) => void;
  nodeXCoords?: number[];
}

const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: (time: number) => void) => (setTimeout(() => cb(Date.now()), 16) as unknown as number);

const caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

export function followCar(options: FollowCarOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  const slot = options.targetSlot ?? 6;
  // S7 center is x = 799, y = 295
  const endX = 324 + (slot % 4) * 190 + 95;
  const aisleY = 295;
  const current = store.driverCarState ?? { x: 195, y: aisleY, rotation: 180 };
  const startX = current.x;
  const durationMs = options.durationMs ?? 1600;

  if (reduced) {
    if (options.onNodePassed && options.nodeXCoords) {
      options.nodeXCoords.forEach((_, idx) => options.onNodePassed!(idx));
    }
    store.setDriverCarState({
      visible: true,
      x: endX,
      y: aisleY,
      rotation: 180,
      headlights: true,
      brakeLights: true,
      greenTrail: [],
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const scaledDuration = t(durationMs);
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let animationFrameId: number;
    let trailIdCounter = 0;
    const trails: { x: number; y: number; id: number; timestamp: number }[] = [];
    const passedNodes = new Set<number>();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / scaledDuration);
      // smooth linear-to-easeout
      const ease = 1 - Math.pow(1 - progress, 2);
      const curX = startX + (endX - startX) * ease;

      // Check node milestones
      if (options.onNodePassed && options.nodeXCoords) {
        options.nodeXCoords.forEach((nx, idx) => {
          if (!passedNodes.has(idx) && curX >= nx - 12) {
            passedNodes.add(idx);
            options.onNodePassed!(idx);
          }
        });
      }

      // Add green trail point behind car every ~50ms
      if (progress < 0.98) {
        trailIdCounter++;
        trails.push({
          x: curX - 25, // trailing behind car
          y: aisleY,
          id: trailIdCounter,
          timestamp: currentTime,
        });
      }

      // Filter and compute opacity for trails (fading after 1.2s)
      const now = currentTime;
      const trailTtl = t(1200);
      const activeTrails = trails
        .filter(tr => now - tr.timestamp < trailTtl)
        .map(tr => ({
          x: tr.x,
          y: tr.y,
          id: tr.id,
          opacity: Math.max(0, 1 - (now - tr.timestamp) / trailTtl) * 0.7,
        }));

      const isArrived = progress >= 1;

      store.setDriverCarState({
        visible: true,
        x: curX,
        y: aisleY,
        rotation: 180,
        headlights: true,
        brakeLights: isArrived,
        greenTrail: activeTrails,
      });

      if (!isArrived) {
        animationFrameId = raf(tick);
      } else {
        unregister();
        // Hold brake lights on arrival
        store.setDriverCarState({
          visible: true,
          x: endX,
          y: aisleY,
          rotation: 180,
          headlights: true,
          brakeLights: true,
          greenTrail: [],
        });
        resolve();
      }
    };

    animationFrameId = raf(tick);

    const unregister = registerCancelHandler(() => {
      caf(animationFrameId);
      store.setDriverCarState({
        visible: true,
        x: endX,
        y: aisleY,
        rotation: 180,
        headlights: true,
        brakeLights: true,
        greenTrail: [],
      });
      resolve();
    });
  });
}
