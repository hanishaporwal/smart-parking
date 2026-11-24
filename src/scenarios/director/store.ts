// ============================================================================
// PARKWAY SCENE DIRECTOR STORE (src/scenarios/director/store.ts)
// Manages the state of all Scene Director overlays (pins, callouts, spotlights,
// panels, chips, recap, dev assertions).
// ============================================================================

import { create } from 'zustand';
import {
  SceneDirectorState,
  PinOverlay,
  CalloutOverlay,
  SpotlightOverlay,
  PanelOverlay,
  ChipOverlay,
  RecapOverlay,
  MismatchWarning,
} from './types';
import { useInspectorStore } from '../fx/inspector';
import { useDecisionBoardStore } from '../fx/decisionBoard';
import { useRouteNodesStore } from '../fx/routeNodes';
import { useLoopTapeStore } from '../fx/loopTape';

export const useDirectorStore = create<SceneDirectorState>((set) => ({
  pins: [],
  callouts: [],
  spotlight: null,
  panels: [],
  chips: [],
  recap: null,
  mismatchWarning: null,

  addPin: (pin: PinOverlay) =>
    set((state) => ({
      pins: [...state.pins.filter((p) => p.id !== pin.id), pin],
    })),

  removePin: (id: string) =>
    set((state) => ({
      pins: state.pins.filter((p) => p.id !== id),
    })),

  setCallout: (callout: CalloutOverlay | null) =>
    set((state) => {
      if (!callout) return { callouts: [] };
      return {
        callouts: [...state.callouts.filter((c) => c.id !== callout.id), callout],
      };
    }),

  setSpotlight: (spotlight: SpotlightOverlay | null) => set({ spotlight }),

  addPanel: (panel: PanelOverlay) =>
    set((state) => ({
      panels: [...state.panels.filter((p) => p.id !== panel.id), panel],
    })),

  removePanel: (id: string) =>
    set((state) => ({
      panels: state.panels.filter((p) => p.id !== id),
    })),

  addChip: (chip: ChipOverlay) =>
    set((state) => ({
      chips: [...state.chips.filter((c) => c.id !== chip.id), chip],
    })),

  removeChip: (id: string) =>
    set((state) => ({
      chips: state.chips.filter((c) => c.id !== id),
    })),

  setRecap: (recap: RecapOverlay | null) => set({ recap }),

  setMismatchWarning: (warning: MismatchWarning | null) =>
    set({ mismatchWarning: warning }),

  clearStepOverlays: (stepId: string, persistIds: string[] = []) =>
    set((state) => ({
      pins: state.pins.filter((p) => p.stepId !== stepId || p.persist || persistIds.includes(p.id)),
      callouts: state.callouts.filter((c) => c.stepId !== stepId || c.persist || persistIds.includes(c.id)),
      panels: state.panels.filter((p) => p.stepId !== stepId || p.persist || persistIds.includes(p.id)),
      chips: state.chips.filter((c) => c.stepId !== stepId || c.persist || persistIds.includes(c.id)),
      spotlight: state.spotlight?.stepId === stepId && !state.spotlight.persist ? null : state.spotlight,
    })),

  clearAllOverlays: () => {
    useInspectorStore.getState().reset();
    useDecisionBoardStore.getState().reset();
    useRouteNodesStore.getState().reset();
    useLoopTapeStore.getState().reset();
    set({
      pins: [],
      callouts: [],
      spotlight: null,
      panels: [],
      chips: [],
      recap: null,
      mismatchWarning: null,
    });
  },
}));
