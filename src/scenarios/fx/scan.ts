import { useFxStore, registerCancelHandler } from './store';
import { useSimStore } from '@/store';
import { t, isReducedMotion } from '../pacing';

export interface ScanOptions {
  columns?: number[]; // defaults to [0, 1, 2, 3]
  stopAtFirstFree?: boolean; // stops at first free column
  colIntervalMs?: number;
  holdMs?: number;
}

export function clearScan(): void {
  useFxStore.getState().setScanState(null);
}

export function scan(options: ScanOptions = {}): Promise<void> {
  const store = useFxStore.getState();
  const simState = useSimStore.getState().state;
  const reduced = isReducedMotion();

  const columns = options.columns ?? [0, 1, 2, 3];
  const stopAtFirstFree = options.stopAtFirstFree ?? true;

  return new Promise<void>(resolve => {
    let colIdx = 0;
    const results: Record<number, 'check' | 'cross'> = {};

    const evaluateColumn = (col: number) => {
      // Lane 0 slot at col, Lane 1 slot at col
      const sLane0 = col;
      const sLane1 = col + 4;
      const occ0 = simState.slots[sLane0]?.occupied;
      const occ1 = simState.slots[sLane1]?.occupied;

      results[sLane0] = occ0 ? 'cross' : 'check';
      results[sLane1] = occ1 ? 'cross' : 'check';

      store.setScanState({
        active: true,
        currentColumn: col,
        results: { ...results },
      });

      return !occ0 || !occ1; // has at least one free slot
    };

    if (reduced) {
      for (const col of columns) {
        const hasFree = evaluateColumn(col);
        if (stopAtFirstFree && hasFree) break;
      }
      resolve();
      return;
    }

    const colIntervalMs = t(options.colIntervalMs ?? 400);

    const stepScan = () => {
      if (colIdx >= columns.length) {
        unregister();
        resolve();
        return;
      }

      const col = columns[colIdx];
      const hasFree = evaluateColumn(col);

      if (stopAtFirstFree && hasFree) {
        // Hold on the winning column briefly, then resolve
        const holdTimer = setTimeout(() => {
          unregister();
          resolve();
        }, t(options.holdMs ?? 350));
        timeouts.push(holdTimer);
        return;
      }

      colIdx++;
      const timer = setTimeout(stepScan, colIntervalMs);
      timeouts.push(timer);
    };

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const unregister = registerCancelHandler(() => {
      timeouts.forEach(tm => clearTimeout(tm));
      resolve();
    });

    stepScan();
  });
}
