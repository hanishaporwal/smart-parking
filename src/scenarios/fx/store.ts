import { create } from 'zustand';
import {
  SonarState,
  ReadoutState,
  PillState,
  TargetRingState,
  ScanState,
  ChipState,
  BarrierState,
  DashboardCardState,
  RouteOverrideState,
  LedVisualState,
  PositionRulerState,
  MeasureArrowState,
  RankBadgeState,
  DriverCarState,
  IntruderCarState,
  PhoneBadgeState,
  PathGhostState,
} from './types';
import { RgbColor } from '@/engine';

export interface FxStoreState {
  // Overlays
  activeSonars: SonarState[];
  sensorGlows: number[]; // slots with glowing rims
  readouts: Record<number, ReadoutState>;
  pillOverrides: Record<number, PillState>;
  targetRings: TargetRingState | null;
  scanState: ScanState | null;
  chips: ChipState[];
  dimmedSlots: Record<number, number>; // slotIndex -> dim level (0..1)
  candidateHalos: number[];
  candidateHalosPersisted: boolean;
  positionRulerState: PositionRulerState | null;
  measureArrowState: MeasureArrowState | null;
  rankBadges: Record<number, RankBadgeState>;
  barrierState: BarrierState;
  dashboardCard: DashboardCardState | null;
  routeOverride: RouteOverrideState | null;
  driverCarState: DriverCarState | null;
  intruderCarState: IntruderCarState | null;
  phoneBadgeState: PhoneBadgeState | null;
  pathGhostState: PathGhostState | null;
  ledVisualState: LedVisualState;
  statPulseTrigger: number;

  // Actions
  addSonar: (sonar: SonarState) => void;
  removeSonar: (slot: number) => void;
  setSensorGlows: (slots: number[]) => void;
  setReadout: (readout: ReadoutState) => void;
  clearReadout: (slot: number) => void;
  clearNonPersistedReadouts: () => void;
  setPillOverride: (pill: PillState) => void;
  clearPillOverride: (slot: number) => void;
  setTargetRings: (rings: TargetRingState | null) => void;
  setScanState: (scan: ScanState | null) => void;
  addChip: (chip: ChipState) => void;
  removeChip: (id: string) => void;
  clearNonPersistedChips: () => void;
  setDimLevel: (slot: number, level: number) => void;
  clearDim: (slot: number) => void;
  clearAllDim: () => void;
  setCandidateHalos: (slots: number[], persist?: boolean) => void;
  addCandidateHalo: (slot: number) => void;
  clearCandidateHalos: () => void;
  setPositionRuler: (ruler: PositionRulerState | null) => void;
  setMeasureArrow: (arrow: MeasureArrowState | null) => void;
  setRankBadge: (slot: number, badge: RankBadgeState) => void;
  removeRankBadge: (slot: number) => void;
  clearRankBadges: () => void;
  setBarrierState: (barrier: Partial<BarrierState>) => void;
  setDashboardCard: (card: DashboardCardState | null) => void;
  setRouteOverride: (route: RouteOverrideState | null) => void;
  setDriverCarState: (car: DriverCarState | null) => void;
  setIntruderCarState: (car: IntruderCarState | null) => void;
  setPhoneBadge: (badge: PhoneBadgeState | null) => void;
  setPathGhost: (ghost: PathGhostState | null) => void;
  setDeferSweepVisual: (defer: boolean) => void;
  setCustomLedPixels: (strip: 0 | 1, fromPx: number, toPx: number, color: RgbColor) => void;
  setSweepProgress: (progress: { strip: 0 | 1; toPx: number; currentPx: number } | null) => void;
  setBlinkingSlot: (slot: number | null) => void;
  triggerStatPulse: () => void;
  clearAllFx: () => void;
  clearStepTemporaryFx: () => void;
}

const emptyCustomPixels = (): (RgbColor | null)[][] => [
  Array(100).fill(null),
  Array(100).fill(null),
];

const initialBarrierState: BarrierState = {
  armRaised: false,
  lightColor: 'red',
};

const initialLedVisualState: LedVisualState = {
  deferSweepVisual: false,
  customPixels: emptyCustomPixels(),
  sweepProgress: null,
  blinkingSlot: null,
  blinkState: false,
};

// Set of active cancellation handlers
const activeCancelHandlers = new Set<() => void>();

export function registerCancelHandler(handler: () => void): () => void {
  activeCancelHandlers.add(handler);
  return () => {
    activeCancelHandlers.delete(handler);
  };
}

export function cancelAllActiveFx(): void {
  activeCancelHandlers.forEach(handler => {
    try {
      handler();
    } catch {
      // ignore cancellation errors
    }
  });
  activeCancelHandlers.clear();
}

export const useFxStore = create<FxStoreState>((set, get) => ({
  activeSonars: [],
  sensorGlows: [],
  readouts: {},
  pillOverrides: {},
  targetRings: null,
  scanState: null,
  chips: [],
  dimmedSlots: {},
  candidateHalos: [],
  candidateHalosPersisted: false,
  positionRulerState: null,
  measureArrowState: null,
  rankBadges: {},
  barrierState: initialBarrierState,
  dashboardCard: null,
  routeOverride: null,
  driverCarState: null,
  intruderCarState: null,
  phoneBadgeState: null,
  pathGhostState: null,
  ledVisualState: initialLedVisualState,
  statPulseTrigger: 0,

  addSonar: sonar =>
    set(state => ({
      activeSonars: [...state.activeSonars.filter(s => s.slot !== sonar.slot), sonar],
    })),

  removeSonar: slot =>
    set(state => ({
      activeSonars: state.activeSonars.filter(s => s.slot !== slot),
    })),

  setSensorGlows: slots => set({ sensorGlows: slots }),

  setReadout: readout =>
    set(state => ({
      readouts: { ...state.readouts, [readout.slot]: readout },
    })),

  clearReadout: slot =>
    set(state => {
      const next = { ...state.readouts };
      delete next[slot];
      return { readouts: next };
    }),

  clearNonPersistedReadouts: () =>
    set(state => {
      const next: Record<number, ReadoutState> = {};
      Object.entries(state.readouts).forEach(([k, v]) => {
        if (v.persisted) next[Number(k)] = v;
      });
      return { readouts: next };
    }),

  setPillOverride: pill =>
    set(state => ({
      pillOverrides: { ...state.pillOverrides, [pill.slot]: pill },
    })),

  clearPillOverride: slot =>
    set(state => {
      const next = { ...state.pillOverrides };
      delete next[slot];
      return { pillOverrides: next };
    }),

  setTargetRings: rings => set({ targetRings: rings }),

  setScanState: scan => set({ scanState: scan }),

  addChip: chip =>
    set(state => ({
      chips: [...state.chips.filter(c => c.id !== chip.id), chip],
    })),

  removeChip: id =>
    set(state => ({
      chips: state.chips.filter(c => c.id !== id),
    })),

  clearNonPersistedChips: () =>
    set(state => ({
      chips: state.chips.filter(c => c.persisted),
    })),

  setDimLevel: (slot, level) =>
    set(state => ({
      dimmedSlots: { ...state.dimmedSlots, [slot]: level },
    })),

  clearDim: slot =>
    set(state => {
      const next = { ...state.dimmedSlots };
      delete next[slot];
      return { dimmedSlots: next };
    }),

  clearAllDim: () => set({ dimmedSlots: {} }),

  setCandidateHalos: (slots, persist) =>
    set({
      candidateHalos: slots,
      candidateHalosPersisted: persist ?? false,
    }),

  addCandidateHalo: slot =>
    set(state => ({
      candidateHalos: Array.from(new Set([...state.candidateHalos, slot])),
    })),

  clearCandidateHalos: () =>
    set({
      candidateHalos: [],
      candidateHalosPersisted: false,
    }),

  setPositionRuler: ruler => set({ positionRulerState: ruler }),

  setMeasureArrow: arrow => set({ measureArrowState: arrow }),

  setRankBadge: (slot, badge) =>
    set(state => ({
      rankBadges: { ...state.rankBadges, [slot]: badge },
    })),

  removeRankBadge: slot =>
    set(state => {
      const next = { ...state.rankBadges };
      delete next[slot];
      return { rankBadges: next };
    }),

  clearRankBadges: () => set({ rankBadges: {} }),

  setBarrierState: partial =>
    set(state => ({
      barrierState: { ...state.barrierState, ...partial },
    })),

  setDashboardCard: card => set({ dashboardCard: card }),

  setRouteOverride: route => set({ routeOverride: route }),

  setDriverCarState: car => set({ driverCarState: car }),

  setIntruderCarState: car => set({ intruderCarState: car }),

  setPhoneBadge: badge => set({ phoneBadgeState: badge }),

  setPathGhost: ghost => set({ pathGhostState: ghost }),

  setDeferSweepVisual: defer =>
    set(state => ({
      ledVisualState: { ...state.ledVisualState, deferSweepVisual: defer },
    })),

  setCustomLedPixels: (strip, fromPx, toPx, color) =>
    set(state => {
      const next = [
        [...state.ledVisualState.customPixels[0]],
        [...state.ledVisualState.customPixels[1]],
      ];
      for (let p = Math.min(fromPx, toPx); p <= Math.max(fromPx, toPx); p++) {
        if (p >= 0 && p < 100) {
          next[strip][p] = { ...color };
        }
      }
      return {
        ledVisualState: { ...state.ledVisualState, customPixels: next },
      };
    }),

  setSweepProgress: progress =>
    set(state => ({
      ledVisualState: { ...state.ledVisualState, sweepProgress: progress },
    })),

  setBlinkingSlot: slot =>
    set(state => ({
      ledVisualState: { ...state.ledVisualState, blinkingSlot: slot },
    })),

  triggerStatPulse: () =>
    set(state => ({
      statPulseTrigger: state.statPulseTrigger + 1,
    })),

  clearAllFx: () => {
    cancelAllActiveFx();
    set({
      activeSonars: [],
      sensorGlows: [],
      readouts: {},
      pillOverrides: {},
      targetRings: null,
      scanState: null,
      chips: [],
      dimmedSlots: {},
      candidateHalos: [],
      candidateHalosPersisted: false,
      positionRulerState: null,
      measureArrowState: null,
      rankBadges: {},
      barrierState: initialBarrierState,
      dashboardCard: null,
      routeOverride: null,
      driverCarState: null,
      intruderCarState: null,
      phoneBadgeState: null,
      pathGhostState: null,
      ledVisualState: initialLedVisualState,
    });
  },

  clearStepTemporaryFx: () => {
    // Clear temporary overlays between steps unless marked persisted
    get().clearNonPersistedReadouts();
    get().clearNonPersistedChips();
    set(state => ({
      activeSonars: [],
      sensorGlows: [],
      scanState: null,
      targetRings: null,
      candidateHalos: state.candidateHalosPersisted ? state.candidateHalos : [],
      positionRulerState: state.positionRulerState?.persisted ? state.positionRulerState : null,
      measureArrowState: null,
      intruderCarState: null,
      pathGhostState: null,
      phoneBadgeState: state.phoneBadgeState?.persisted ? state.phoneBadgeState : null,
      rankBadges: Object.fromEntries(
        Object.entries(state.rankBadges).filter(([, b]) => b.persisted)
      ),
      // keep routeOverride if persisted
      routeOverride: state.routeOverride?.persisted ? state.routeOverride : null,
    }));
  },
}));
