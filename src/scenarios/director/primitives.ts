// ============================================================================
// PARKWAY SCENE DIRECTOR PRIMITIVES (src/scenarios/director/primitives.ts)
// Building blocks for scene choreography. Every primitive returns a Promise,
// is cancellable with AbortSignal, scales durations through t(), and applies
// end-state instantly under prefers-reduced-motion.
// ============================================================================

import { getAnchor, Rect } from '../anchors';
import { computeCalloutPlacement, PlacementSide } from './placement';
import { useDirectorStore } from './store';
import { t, isReducedMotion } from '../pacing';
import {
  sonar as fxSonar,
  readout as fxReadout,
  pill as fxPill,
  targetRing as fxTargetRing,
  ledFill as fxLedFill,
  sweep as fxSweep,
  deferSweepVisual,
  route as fxRoute,
  zoneWipe as fxZoneWipe,
  dim as fxDim,
  haloCandidates as fxHaloCandidates,
  car,
  barrier,
  entryCar,
  driverCar,
  followCar,
} from '../fx';

export { deferSweepVisual, car, barrier, entryCar, driverCar, followCar };

export function parseSlotIndex(slot: number | string): number {
  if (typeof slot === 'number') return slot;
  const match = slot.match(/[sS]?(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // If 1-indexed (S1..S8), convert to 0..7
    return num >= 1 && num <= 8 ? num - 1 : num;
  }
  return 0;
}

export interface PrimitiveOptions {
  signal?: AbortSignal;
  stepId?: string;
  persist?: boolean;
}

/**
 * pin(anchor, n): gold numbered circle 28px (number in mono font),
 * ring pulse once at step start.
 */
export function pin(
  anchor: string,
  n: number,
  options: PrimitiveOptions = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();

  const rect = getAnchor(anchor);
  const cx = Math.round(rect.x + rect.width / 2);
  const cy = Math.round(rect.y + rect.height / 2);
  const stepId = options.stepId || 'active';

  useDirectorStore.getState().addPin({
    id: `pin-${stepId}-${anchor}`,
    stepId,
    anchor,
    n,
    x: cx,
    y: cy,
    persist: options.persist,
  });

  return Promise.resolve();
}

/**
 * callout(text, anchor, side): glass chip (G3 recipe), 14px text, <= 10 words,
 * with the step number pin at its left and leader line to anchor.
 */
export function callout(
  text: string,
  anchor: string,
  side?: PlacementSide,
  options: PrimitiveOptions & { n?: number } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();

  const placement = computeCalloutPlacement(anchor, side, text);
  const stepId = options.stepId || 'active';
  const n = options.n ?? 1;

  useDirectorStore.getState().setCallout({
    id: `callout-${stepId}-${anchor}`,
    stepId,
    text,
    anchor,
    n,
    placement,
    persist: options.persist,
  });

  return Promise.resolve();
}

/**
 * spotlight(anchors): SVG mask scrim at 62% black over lot except listed anchors.
 * "none" removes it.
 */
export function spotlight(
  anchors: string[] | 'none',
  options: PrimitiveOptions = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();

  const stepId = options.stepId || 'active';

  if (anchors === 'none' || (Array.isArray(anchors) && anchors.length === 0)) {
    useDirectorStore.getState().setSpotlight(null);
    return Promise.resolve();
  }

  const rects: Rect[] = anchors.map((name) => getAnchor(name));

  useDirectorStore.getState().setSpotlight({
    stepId,
    anchors,
    rects,
    persist: options.persist,
  });

  return Promise.resolve();
}

/**
 * panel(rect, title): glass panel (G3, 24px radius, blur) that opens over the lot.
 */
export function panel(
  rect: Rect,
  title: string,
  options: PrimitiveOptions = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();

  const stepId = options.stepId || 'active';

  useDirectorStore.getState().addPanel({
    id: `panel-${stepId}-${title.toLowerCase().replace(/\s+/g, '-')}`,
    stepId,
    rect,
    title,
    persist: options.persist,
  });

  return Promise.resolve();
}

/**
 * chip(anchor, text, icon): small glass chip on the lot
 */
export function chip(
  anchor: string,
  text: string,
  icon?: string,
  options: PrimitiveOptions = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();

  const rect = getAnchor(anchor);
  const x = Math.round(rect.x + rect.width / 2);
  const y = Math.round(rect.y + rect.height / 2);
  const stepId = options.stepId || 'active';

  useDirectorStore.getState().addChip({
    id: `chip-${stepId}-${text.toLowerCase().replace(/\s+/g, '-')}`,
    stepId,
    anchor,
    text,
    icon,
    x,
    y,
    persist: options.persist,
  });

  return Promise.resolve();
}

/**
 * countUp(el, from, to, ms): counter animation interpolating from -> to
 */
export function countUp(
  el: HTMLElement | string,
  from: number,
  to: number,
  ms = 1000,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  const reduced = isReducedMotion();
  const targetElement = typeof el === 'string' ? document.getElementById(el) : el;

  if (reduced || !targetElement) {
    if (targetElement) targetElement.textContent = String(to);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const duration = t(ms);
    const start = performance.now();

    const update = (now: number) => {
      if (options.signal?.aborted) {
        targetElement.textContent = String(to);
        resolve();
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      const val = Math.round(from + (to - from) * progress);
      targetElement.textContent = String(val);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(update);
  });
}

/**
 * typeText(el, text, cps): typewriter effect into element
 */
export function typeText(
  el: HTMLElement | string,
  text: string,
  cps = 30,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  const reduced = isReducedMotion();
  const targetElement = typeof el === 'string' ? document.getElementById(el) : el;

  if (reduced || !targetElement) {
    if (targetElement) targetElement.textContent = text;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let index = 0;
    const intervalMs = t(1000 / cps);

    const interval = setInterval(() => {
      if (options.signal?.aborted) {
        clearInterval(interval);
        targetElement.textContent = text;
        resolve();
        return;
      }

      index++;
      targetElement.textContent = text.slice(0, index);

      if (index >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}

/**
 * sonar(slot | "all", { stagger }): two expanding info-blue arcs
 */
export function sonar(
  slot: number | string | (number | string)[] | 'all',
  options: {
    stagger?: number;
    tone?: 'info' | 'red' | 'green';
    duration?: number;
    signal?: AbortSignal;
  } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const s =
    slot === 'all'
      ? 'all'
      : Array.isArray(slot)
      ? slot.map(parseSlotIndex)
      : parseSlotIndex(slot);
  return fxSonar(s, {
    stagger: options.stagger,
    tone: options.tone,
    duration: options.duration,
  });
}

/**
 * readout(slot, cm, tone): glass bubble above the sensor with mono value ("28 cm")
 */
export function readout(
  slot: number | string,
  cm: number,
  tone?: 'green' | 'red' | 'info',
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const idx = parseSlotIndex(slot);
  const resolvedTone: 'green' | 'red' = tone === 'red' || cm < 15 ? 'red' : 'green';
  return fxReadout(idx, cm, resolvedTone);
}

/**
 * pillFlip(slot, state): 3D flip of the status pill (250 ms)
 */
export function pillFlip(
  slot: number | string,
  state: 'VACANT' | 'OCCUPIED' | 'TARGET',
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const idx = parseSlotIndex(slot);
  return fxPill(idx, state);
}

/**
 * targetRing(slots): gold ring draws in around the card then pulses
 */
export function targetRing(
  slots: number | string | (number | string)[],
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const list = Array.isArray(slots) ? slots : [slots];
  const indices = list.map(parseSlotIndex);
  return fxTargetRing(indices);
}

/**
 * ledFill(stripN, fromPx, toPx, colour, msPerPx)
 */
export function ledFill(
  stripN: 1 | 2,
  fromPx: number,
  toPx: number,
  colour: any,
  msPerPx = 20,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const stripIdx = (stripN - 1) as 0 | 1;
  return fxLedFill(stripIdx, fromPx, toPx, colour, msPerPx);
}

/**
 * sweep(stripN, toPx, { skipOccupied }): sweeps at claim speed
 */
export function sweep(
  stripN: 1 | 2,
  toPx: number,
  options: { skipOccupied?: boolean; signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const stripIdx = (stripN - 1) as 0 | 1;
  return fxSweep(stripIdx, toPx, { skipOccupied: options.skipOccupied });
}

/**
 * route(lane, slot): existing guidance route (dotted past occupied, solid to target)
 */
export function route(
  lane: 0 | 1 | 2,
  slot: number | string,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const targetSlot = parseSlotIndex(slot);
  const laneIdx = lane === 2 ? 1 : (lane as 0 | 1);
  return fxRoute(laneIdx, targetSlot);
}

/**
 * zoneWipe(stripN, fromPx, toPx, colour)
 */
export function zoneWipe(
  stripN: 1 | 2,
  fromPx: number,
  toPx: number,
  colour?: any,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const stripIdx = (stripN - 1) as 0 | 1;
  return fxZoneWipe(stripIdx, fromPx, toPx, colour);
}

/**
 * dim(slots, level)
 */
export function dim(
  slots: number | string | (number | string)[],
  level = 0.45,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const list = Array.isArray(slots) ? slots : [slots];
  const indices = list.map(parseSlotIndex);
  return fxDim(indices, level);
}

/**
 * halo(slots)
 */
export function halo(
  slots: number | string | (number | string)[],
  options: { signal?: AbortSignal; stagger?: number; persist?: boolean } = {}
): Promise<void> {
  if (options.signal?.aborted) return Promise.resolve();
  const list = Array.isArray(slots) ? slots : [slots];
  const indices = list.map(parseSlotIndex);
  return fxHaloCandidates(indices, {
    stagger: options.stagger,
    persist: options.persist,
  });
}
