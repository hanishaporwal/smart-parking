// ============================================================================
// PARKWAY CLAIM 5 DECISION BOARD FX (src/scenarios/fx/decisionBoard.ts)
// Primitives for ranking, column scanning, scoreboard comparison, tie badges,
// position tags, and aisle count-up chips.
// ============================================================================

import { create } from 'zustand';
import { useFxStore, registerCancelHandler } from './store';
import { t, isReducedMotion } from '../pacing';
import { scan as fxScan, clearScan } from './scan';
import { clearCandidateHalos } from './halo';
import { parseSlotIndex } from '../director/primitives';

export interface ScoreboardState {
  slotA: number; // e.g. 2 for S3
  posA: number;  // 2
  slotB: number; // e.g. 5 for S6
  posB: number;  // 1
  showComparator: boolean;
  winnerSlot: number | null; // e.g. 5 for S6
  fartherSlot: number | null; // e.g. 2 for S3
}

export interface DecisionBoardState {
  positionTags: Record<number, { text: string }>;
  scoreboard: ScoreboardState | null;
  tieBadge: { slots: number[]; text: string } | null;
  aisleCountChip: { occ: number; free: number } | null;
  formulaChip: string | null;

  setPositionTag: (slot: number, text: string) => void;
  clearPositionTags: () => void;
  setScoreboard: (sb: ScoreboardState | null) => void;
  setTieBadge: (badge: { slots: number[]; text: string } | null) => void;
  setAisleCountChip: (chip: { occ: number; free: number } | null) => void;
  setFormulaChip: (formula: string | null) => void;
  reset: () => void;
}

export const useDecisionBoardStore = create<DecisionBoardState>((set) => ({
  positionTags: {},
  scoreboard: null,
  tieBadge: null,
  aisleCountChip: null,
  formulaChip: null,

  setPositionTag: (slot, text) =>
    set((state) => ({
      positionTags: { ...state.positionTags, [slot]: { text } },
    })),

  clearPositionTags: () => set({ positionTags: {} }),

  setScoreboard: (scoreboard) => set({ scoreboard }),

  setTieBadge: (tieBadge) => set({ tieBadge }),

  setAisleCountChip: (aisleCountChip) => set({ aisleCountChip }),

  setFormulaChip: (formulaChip) => set({ formulaChip }),

  reset: () =>
    set({
      positionTags: {},
      scoreboard: null,
      tieBadge: null,
      aisleCountChip: null,
      formulaChip: null,
    }),
}));

/**
 * positionMap: reveals Pos 0 to Pos 3, column by column (450 ms each),
 * with measuring arrow from the gate, dropping position tags on slots.
 */
export function positionMap(options: {
  onColumnRevealed?: (col: number) => void;
  dwellPerColumn?: number;
} = {}): Promise<void> {
  const store = useFxStore.getState();
  const dbStore = useDecisionBoardStore.getState();
  const reduced = isReducedMotion();
  const dwell = t(options.dwellPerColumn ?? 450);

  if (reduced) {
    store.setPositionRuler({
      visible: true,
      visibleColumns: [0, 1, 2, 3],
      activeHighlightColumn: null,
      persisted: true,
    });
    store.setMeasureArrow({
      visible: true,
      targetX: 989,
      currentColumn: 3,
    });
    [0, 1, 2, 3].forEach((col) => {
      options.onColumnRevealed?.(col);
      dbStore.setPositionTag(col, `pos ${col}`);
      dbStore.setPositionTag(col + 4, `pos ${col}`);
    });
    dbStore.setFormulaChip('position = slot index mod 4');
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const targets = [
      { col: 0, x: 419 },
      { col: 1, x: 609 },
      { col: 2, x: 799 },
      { col: 3, x: 989 },
    ];

    let step = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const unregister = registerCancelHandler(() => {
      timeouts.forEach((tm) => clearTimeout(tm));
      resolve();
    });

    const runStep = () => {
      if (step >= targets.length) {
        // Clear highlight and set formula chip
        const ruler = useFxStore.getState().positionRulerState;
        if (ruler) {
          useFxStore.getState().setPositionRuler({
            ...ruler,
            activeHighlightColumn: null,
          });
        }
        dbStore.setFormulaChip('position = slot index mod 4');
        unregister();
        resolve();
        return;
      }

      const { col, x } = targets[step];
      const curCols = targets.slice(0, step + 1).map((t) => t.col);

      useFxStore.getState().setPositionRuler({
        visible: true,
        visibleColumns: curCols,
        activeHighlightColumn: col,
        persisted: true,
      });

      useFxStore.getState().setMeasureArrow({
        visible: true,
        targetX: x,
        currentColumn: col,
      });

      // Fire callback and drop position tags
      options.onColumnRevealed?.(col);
      useDecisionBoardStore.getState().setPositionTag(col, `pos ${col}`);
      useDecisionBoardStore.getState().setPositionTag(col + 4, `pos ${col}`);

      step++;
      const tm = setTimeout(runStep, dwell);
      timeouts.push(tm);
    };

    runStep();
  });
}

/**
 * clearPositionMap: hides the ruler, arrow, position tags, and formula chip.
 */
export function clearPositionMap(): void {
  useFxStore.getState().setPositionRuler(null);
  useFxStore.getState().setMeasureArrow(null);
  useDecisionBoardStore.getState().clearPositionTags();
  useDecisionBoardStore.getState().setFormulaChip(null);
}

/**
 * positionTag: sets a mono chip in the slot's sensor band.
 */
export function positionTag(slot: number | string): Promise<void> {
  const idx = parseSlotIndex(slot);
  useDecisionBoardStore.getState().setPositionTag(idx, `pos ${idx % 4}`);
  return Promise.resolve();
}

/**
 * clearPositionTags: removes all position tags.
 */
export function clearPositionTags(): void {
  useDecisionBoardStore.getState().clearPositionTags();
}

/**
 * scanner: vertical bar sweeps across columns, flashing cross/check,
 * stopping at the first column with a free slot.
 */
export function scanner(options: {
  columns?: number[];
  stopAtFirstFree?: boolean;
  colIntervalMs?: number;
  holdMs?: number;
} = {}): Promise<void> {
  return fxScan({
    columns: options.columns,
    stopAtFirstFree: options.stopAtFirstFree ?? true,
    colIntervalMs: options.colIntervalMs,
    holdMs: options.holdMs,
  });
}

export { clearScan as clearScanner };

/**
 * scoreboard(a, b): shows two glass chips in the aisle center,
 * comparator animation, and crown on the winner.
 */
export function scoreboard(
  a: number | string,
  b: number | string
): {
  animateComparator: () => Promise<void>;
  crownWinner: (winner: number | string) => Promise<void>;
  setFartherTag: (slot: number | string) => void;
} {
  const idxA = parseSlotIndex(a);
  const idxB = parseSlotIndex(b);
  const posA = idxA % 4;
  const posB = idxB % 4;

  useDecisionBoardStore.getState().setScoreboard({
    slotA: idxA,
    posA,
    slotB: idxB,
    posB,
    showComparator: false,
    winnerSlot: null,
    fartherSlot: null,
  });

  return {
    animateComparator: () => {
      const reduced = isReducedMotion();
      const sb = useDecisionBoardStore.getState().scoreboard;
      if (sb) {
        useDecisionBoardStore.getState().setScoreboard({
          ...sb,
          showComparator: true,
        });
      }
      if (reduced) return Promise.resolve();
      return new Promise<void>((resolve) => {
        setTimeout(resolve, t(350));
      });
    },

    crownWinner: (winner: number | string) => {
      const winnerIdx = parseSlotIndex(winner);
      const sb = useDecisionBoardStore.getState().scoreboard;
      if (sb) {
        useDecisionBoardStore.getState().setScoreboard({
          ...sb,
          winnerSlot: winnerIdx,
        });
      }
      return Promise.resolve();
    },

    setFartherTag: (slot: number | string) => {
      const fartherIdx = parseSlotIndex(slot);
      const sb = useDecisionBoardStore.getState().scoreboard;
      if (sb) {
        useDecisionBoardStore.getState().setScoreboard({
          ...sb,
          fartherSlot: fartherIdx,
        });
      }
    },
  };
}

/**
 * clearScoreboard: clears the aisle scoreboard.
 */
export function clearScoreboard(): void {
  useDecisionBoardStore.getState().setScoreboard(null);
}

/**
 * tieBadge: displays glass chip over both tied slots ("Tie at position 1").
 */
export function tieBadge(slots: (number | string)[]): Promise<void> {
  const indices = slots.map(parseSlotIndex);
  useDecisionBoardStore.getState().setTieBadge({
    slots: indices,
    text: `Tie at position ${indices[0] % 4}`,
  });
  return Promise.resolve();
}

/**
 * clearTieBadge: hides the tie badge.
 */
export function clearTieBadge(): void {
  useDecisionBoardStore.getState().setTieBadge(null);
}

/**
 * aisleCountChip: reveals an aisle chip "Occupied 3 • Free 5" with count-up.
 */
export function aisleCountChip(
  occ: number,
  free: number,
  durationMs = 900
): Promise<void> {
  const reduced = isReducedMotion();
  const dbStore = useDecisionBoardStore.getState();

  if (reduced) {
    dbStore.setAisleCountChip({ occ, free });
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const totalMs = t(durationMs);
    const start = performance.now();

    dbStore.setAisleCountChip({ occ: 0, free: 0 });

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / totalMs);
      const currentOcc = Math.round(occ * progress);
      const currentFree = Math.round(free * progress);

      dbStore.setAisleCountChip({ occ: currentOcc, free: currentFree });

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        dbStore.setAisleCountChip({ occ, free });
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * clearAisleCountChip: hides the aisle count chip.
 */
export function clearAisleCountChip(): void {
  useDecisionBoardStore.getState().setAisleCountChip(null);
}

/**
 * fadeOutDecisionBoard: gracefully cleans up all Claim 5 visual overlays.
 */
export function fadeOutDecisionBoard(): void {
  clearPositionMap();
  clearPositionTags();
  clearScoreboard();
  clearTieBadge();
  clearAisleCountChip();
  clearCandidateHalos();
  clearScan();
}
