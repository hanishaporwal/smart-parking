// ============================================================================
// PARKWAY CLAIM 7 SENSOR LOOP TAPE & PLAN CHIPS (src/scenarios/fx/loopTape.ts)
// Telemetry scrolling loop tape in ground.bottomLeft showing 100 ms cycle ticks,
// blind sweep blocks (375 ms), taken/seen event marks, and Plan A / B chips.
// ============================================================================

import { create } from 'zustand';
import { parseSlotIndex } from '../director/primitives';

export interface PlanChipState {
  name: string;   // 'Plan A' | 'Plan B'
  slot: number;   // 1 (S2), 2 (S3)
  status: 'active' | 'cancelled';
}

export interface LoopTapeStoreState {
  visible: boolean;
  ticking: boolean;
  blindMs: number | null;
  takenMark: boolean;
  seenMark: { visible: boolean; text: string } | null;
  planChips: PlanChipState[];

  setLoopTapeVisible: (visible: boolean) => void;
  setTicking: (ticking: boolean) => void;
  setBlindBlock: (ms: number | null) => void;
  addTakenMark: () => void;
  addSeenMark: (text?: string) => void;
  setPlanChip: (name: string, slot: number) => void;
  cancelPlanChip: (name: string) => void;
  clearPlanChips: () => void;
  reset: () => void;
}

export const useLoopTapeStore = create<LoopTapeStoreState>((set) => ({
  visible: false,
  ticking: false,
  blindMs: null,
  takenMark: false,
  seenMark: null,
  planChips: [],

  setLoopTapeVisible: (visible) => set({ visible }),

  setTicking: (ticking) => set({ ticking }),

  setBlindBlock: (blindMs) => set({ blindMs }),

  addTakenMark: () => set({ takenMark: true }),

  addSeenMark: (text = 'Seen within 100 ms') =>
    set({ seenMark: { visible: true, text } }),

  setPlanChip: (name, slot) =>
    set((state) => ({
      planChips: [
        ...state.planChips.filter((p) => p.name !== name),
        { name, slot, status: 'active' },
      ],
    })),

  cancelPlanChip: (name) =>
    set((state) => ({
      planChips: state.planChips.map((p) =>
        p.name === name ? { ...p, status: 'cancelled' } : p
      ),
    })),

  clearPlanChips: () => set({ planChips: [] }),

  reset: () =>
    set({
      visible: false,
      ticking: false,
      blindMs: null,
      takenMark: false,
      seenMark: null,
      planChips: [],
    }),
}));

/**
 * loopTape(): mounts the sensor loop tape in ground.bottomLeft and starts ticking.
 */
export function loopTape(): Promise<void> {
  const store = useLoopTapeStore.getState();
  store.setLoopTapeVisible(true);
  store.setTicking(true);
  return Promise.resolve();
}

/**
 * blindBlock(ms): displays a hatched grey block on the tape.
 */
export function blindBlock(ms = 375): Promise<void> {
  useLoopTapeStore.getState().setBlindBlock(ms);
  return Promise.resolve();
}

/**
 * clearBlindBlock(): clears the blind block from the tape.
 */
export function clearBlindBlock(): void {
  useLoopTapeStore.getState().setBlindBlock(null);
}

/**
 * takenMark(): adds a red taken event mark on the tape.
 */
export function takenMark(): void {
  useLoopTapeStore.getState().addTakenMark();
}

/**
 * seenMark(text): adds a green seen event mark on the tape.
 */
export function seenMark(text = 'Seen within 100 ms'): void {
  useLoopTapeStore.getState().addSeenMark(text);
}

/**
 * planChip(name, slot): attaches a glass plan chip (e.g. "Plan A: S2") to the slot route end.
 */
export function planChip(name: string, slot: number | string): Promise<void> {
  const idx = parseSlotIndex(slot);
  useLoopTapeStore.getState().setPlanChip(name, idx);
  return Promise.resolve();
}

/**
 * cancelPlanChip(name): turns the plan chip red with strike-through text.
 */
export function cancelPlanChip(name: string): void {
  useLoopTapeStore.getState().cancelPlanChip(name);
}

/**
 * clearLoopTape(): cleans up all Claim 7 loop tape overlays.
 */
export function clearLoopTape(): void {
  useLoopTapeStore.getState().reset();
}
