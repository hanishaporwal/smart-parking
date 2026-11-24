import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';

export interface PositionRulerOptions {
  persist?: boolean;
}

export function positionRuler(options: PositionRulerOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setPositionRuler({
      visible: true,
      visibleColumns: [0, 1, 2, 3],
      activeHighlightColumn: null,
      persisted: options.persist ?? true,
    });
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    store.setPositionRuler({
      visible: true,
      visibleColumns: [0],
      activeHighlightColumn: 0,
      persisted: options.persist ?? true,
    });

    const stepMs = t(500);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const unregister = registerCancelHandler(() => {
      timeouts.forEach(tm => clearTimeout(tm));
      resolve();
    });

    [1, 2, 3].forEach((col, idx) => {
      const tm = setTimeout(() => {
        const cur = useFxStore.getState().positionRulerState;
        if (cur) {
          useFxStore.getState().setPositionRuler({
            ...cur,
            visibleColumns: Array.from(new Set([...cur.visibleColumns, col])),
            activeHighlightColumn: col,
          });
        }
        if (idx === 2) {
          const finishTm = setTimeout(() => {
            const finalCur = useFxStore.getState().positionRulerState;
            if (finalCur) {
              useFxStore.getState().setPositionRuler({
                ...finalCur,
                activeHighlightColumn: null,
              });
            }
            unregister();
            resolve();
          }, t(400));
          timeouts.push(finishTm);
        }
      }, (idx + 1) * stepMs);
      timeouts.push(tm);
    });
  });
}

export function clearPositionRuler(): void {
  useFxStore.getState().setPositionRuler(null);
}

export interface MeasureArrowOptions {
  dwellPerColumn?: number; // default 500 ms
}

export function measureArrow(options: MeasureArrowOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const reduced = isReducedMotion();

  if (reduced) {
    store.setMeasureArrow({
      visible: true,
      targetX: 989,
      currentColumn: 3,
    });
    return Promise.resolve();
  }

  const dwellMs = t(options.dwellPerColumn ?? 500);
  const targets = [
    { col: 0, x: 419 },
    { col: 1, x: 609 },
    { col: 2, x: 799 },
    { col: 3, x: 989 },
  ];

  return new Promise<void>(resolve => {
    store.setMeasureArrow({
      visible: true,
      targetX: 220,
      currentColumn: 0,
    });

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const unregister = registerCancelHandler(() => {
      timeouts.forEach(tm => clearTimeout(tm));
      resolve();
    });

    targets.forEach((tgt, idx) => {
      const tm = setTimeout(() => {
        useFxStore.getState().setMeasureArrow({
          visible: true,
          targetX: tgt.x,
          currentColumn: tgt.col,
        });

        if (idx === targets.length - 1) {
          const finalTm = setTimeout(() => {
            unregister();
            resolve();
          }, dwellMs);
          timeouts.push(finalTm);
        }
      }, idx * dwellMs);
      timeouts.push(tm);
    });
  });
}

export function clearMeasureArrow(): void {
  useFxStore.getState().setMeasureArrow(null);
}
