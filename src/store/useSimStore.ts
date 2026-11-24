import { create } from 'zustand';
import {
  EngineState,
  SimConfig,
  SimEvent,
  createInitialEngineState,
  tick,
  SimulatedSource,
  SensorModel,
  SensorFault,
} from '@/engine';
import { CLAIM_TIME_SCALE, isClaimPlaying } from '@/scenarios/pacing';

interface SimStore {
  // Engine & Simulation State
  state: EngineState;
  events: SimEvent[];
  source: SimulatedSource;
  simTimeMs: number;

  // Sensor telemetry & controls
  sensorModel: SensorModel;
  sensorFaults: SensorFault[];

  // Slot telemetry / popover selection
  selectedSlotIndex: number | null;
  slotPopoverAnchor: { x: number; y: number } | null;

  // Actions
  setDistance: (slotIndex: number, cm: number) => void;
  setAllDistances: (distances: number[], atTimeMs?: number) => void;
  updateConfig: (newConfig: Partial<SimConfig>) => void;
  resetSim: (initialDistances?: number[]) => void;
  clearEvents: () => void;
  setSelectedSlotIndex: (idx: number | null, anchor?: { x: number; y: number } | null) => void;
  startLoop: () => void;
  stopLoop: () => void;

  carStyle: 'sedan' | 'coupe' | 'suv';
  setCarStyle: (style: 'sedan' | 'coupe' | 'suv') => void;

  // Sensor actions
  setSensorModel: (model: SensorModel) => void;
  setSensorFault: (slotIndex: number, fault: SensorFault, stuckValue?: number) => void;
  setAllSensorFaults: (fault: SensorFault) => void;
  resetFaults: () => void;
  triggerSweep: () => void;
}

// Initial default configuration
const defaultInitialDistances = [25, 25, 25, 25, 25, 25, 25, 25]; // all vacant
const initialSource = new SimulatedSource(defaultInitialDistances);
const initialConfig: SimConfig = {
  threshold: 15,
  mode: 'firmware',
  filtering: 'none',
  hysteresisLow: 15,
  hysteresisHigh: 18,
  debounceTicks: 3,
};

let loopId: number | null = null;
let lastWallTime = performance.now();

let currentSimTime = 0;

function hasSlotsChanged(prevSlots: EngineState['slots'], nextSlots: EngineState['slots']): boolean {
  if (prevSlots.length !== nextSlots.length) return true;
  for (let i = 0; i < prevSlots.length; i++) {
    const a = prevSlots[i];
    const b = nextSlots[i];
    if (
      !a ||
      !b ||
      a.distance !== b.distance ||
      a.occupied !== b.occupied ||
      a.isTarget !== b.isTarget
    ) {
      return true;
    }
  }
  return false;
}

export const useSimStore = create<SimStore>((set, get) => ({
  state: tick(createInitialEngineState(initialConfig, defaultInitialDistances), initialSource, 0).state,
  events: [],
  source: initialSource,
  get simTimeMs() {
    return currentSimTime;
  },
  sensorModel: 'ideal',
  sensorFaults: initialSource.getAllFaults(),
  selectedSlotIndex: null,
  slotPopoverAnchor: null,
  carStyle: 'sedan',
  setCarStyle: (style) => set({ carStyle: style }),

  setDistance: (slotIndex: number, cm: number) => {
    const { source, state, events } = get();
    source.setDistance(slotIndex, cm);
    const effTime = Math.max(currentSimTime, state.blockedUntilMs);
    currentSimTime = effTime;
    const result = tick(state, source, effTime);
    set({
      state: result.state,
      simTimeMs: effTime,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  setAllDistances: (distances: number[], atTimeMs?: number) => {
    const { source, state, events } = get();
    source.setAllDistances(distances);
    const effTime = atTimeMs !== undefined ? atTimeMs : Math.max(currentSimTime, state.blockedUntilMs);
    currentSimTime = effTime;
    const result = tick(state, source, effTime);
    set({
      state: result.state,
      simTimeMs: effTime,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  updateConfig: (newConfig: Partial<SimConfig>) => {
    const { state, source, events } = get();
    const mergedConfig: SimConfig = { ...state.config, ...newConfig };
    const nextState = {
      ...state,
      config: mergedConfig,
      needDraw: true,
    };
    const effTime = Math.max(currentSimTime, state.blockedUntilMs);
    currentSimTime = effTime;
    const result = tick(nextState, source, effTime);
    set({
      state: result.state,
      simTimeMs: effTime,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  resetSim: (initialDistances?: number[]) => {
    const distances = initialDistances ?? defaultInitialDistances;
    const newSource = new SimulatedSource(distances);
    const currConfig = get().state.config;
    const rawState = createInitialEngineState(currConfig, distances);
    const result = tick(rawState, newSource, 0);
    currentSimTime = 0;

    set({
      state: result.state,
      source: newSource,
      sensorModel: newSource.getModel(),
      sensorFaults: newSource.getAllFaults(),
      simTimeMs: 0,
      events: [
        {
          type: 'SENSOR_READING',
          timestamp: 0,
          description: 'Simulation environment reset to physical boot state.',
        },
      ],
    });
  },

  clearEvents: () => set({ events: [] }),

  setSensorModel: (model: SensorModel) => {
    const { source, state, events } = get();
    source.setModel(model);
    const result = tick(state, source, currentSimTime);
    set({
      sensorModel: model,
      state: result.state,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  setSensorFault: (slotIndex: number, fault: SensorFault, stuckValue?: number) => {
    const { source, state, events } = get();
    source.setFault(slotIndex, fault, stuckValue);
    const result = tick(state, source, currentSimTime);
    set({
      sensorFaults: source.getAllFaults(),
      state: result.state,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  setAllSensorFaults: (fault: SensorFault) => {
    const { source, state, events } = get();
    source.setAllFaults(fault);
    const result = tick(state, source, currentSimTime);
    set({
      sensorFaults: source.getAllFaults(),
      state: result.state,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  resetFaults: () => {
    const { source, state, events } = get();
    source.resetFaults();
    const result = tick(state, source, currentSimTime);
    set({
      sensorFaults: source.getAllFaults(),
      state: result.state,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  triggerSweep: () => {
    const { state, source, events } = get();
    const nextState = {
      ...state,
      needDraw: true,
      sweep: null,
      blockedUntilMs: 0,
    };
    const result = tick(nextState, source, currentSimTime);
    set({
      state: result.state,
      events: result.events.length > 0 ? [...result.events, ...events].slice(0, 200) : events,
    });
  },

  setSelectedSlotIndex: (idx: number | null, anchor?: { x: number; y: number } | null) => {
    set({
      selectedSlotIndex: idx,
      slotPopoverAnchor: anchor ?? null,
    });
  },

  startLoop: () => {
    if (loopId !== null) return;
    lastWallTime = performance.now();

    const loop = (currentWallTime: number) => {
      const elapsedWall = currentWallTime - lastWallTime;
      lastWallTime = currentWallTime;

      const { state, source, events } = get();

      if (elapsedWall > 0) {
        const isSlowSweep = state.sweep !== null && isClaimPlaying();
        const effectiveElapsed = isSlowSweep ? elapsedWall / CLAIM_TIME_SCALE : elapsedWall;
        const clampedElapsed = Math.min(200, effectiveElapsed);
        currentSimTime += clampedElapsed;

        const result = tick(state, source, currentSimTime);

        // Only dispatch state updates when simulation state actually changed functionally or visually
        const sweepActive = result.state.sweep !== null || state.sweep !== null;
        const blinkToggled = result.state.blinkOn !== state.blinkOn;
        const hasNewEvents = result.events.length > 0;
        const needDrawChanged = result.state.needDraw !== state.needDraw;
        const blockedChanged = result.state.blockedUntilMs !== state.blockedUntilMs;
        const slotsChanged = hasSlotsChanged(state.slots, result.state.slots);

        if (sweepActive || blinkToggled || hasNewEvents || needDrawChanged || blockedChanged || slotsChanged) {
          const updatedEvents = hasNewEvents
            ? [...result.events, ...events].slice(0, 200)
            : events;

          set({
            state: result.state,
            simTimeMs: currentSimTime,
            events: updatedEvents,
          });
        }
      }

      loopId = requestAnimationFrame(loop);
    };

    loopId = requestAnimationFrame(loop);
  },

  stopLoop: () => {
    if (loopId !== null) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }
  },
}));

export const initSimulationLoop = () => {
  const store = useSimStore.getState();
  store.startLoop();
  return () => {
    store.stopLoop();
  };
};

if (typeof window !== 'undefined') {
  (window as unknown as { __simStore: typeof useSimStore }).__simStore = useSimStore;
}

