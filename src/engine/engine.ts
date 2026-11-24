import {
  NUM_SLOTS,
  SLOTS_PER_STRIP,
  BLINK_MS,
  SWEEP_STEP_MS,
  TIMEOUT_DISTANCE_CM,
  DEFAULT_OCCUPANCY_THRESHOLD_CM,
  DataSource,
  EngineState,
  SimConfig,
  SimEvent,
  SlotState,
  LedFrame,
  SweepState,
} from './types';
import { classifySlots } from './classify';
import { selectTargets } from './selectTargets';
import {
  buildBaseFrame,
  buildSweepFrame,
  buildCompletedFrame,
  calculateEndPixels,
} from './ledRenderer';

/**
 * Creates the initial engine state replicating ESP32 boot state.
 * Physical firmware initializes needDraw = true and blinkOn = true.
 */
export function createInitialEngineState(
  customConfig?: Partial<SimConfig>,
  initialDistances?: number[],
): EngineState {
  const config: SimConfig = {
    threshold: customConfig?.threshold ?? DEFAULT_OCCUPANCY_THRESHOLD_CM,
    mode: customConfig?.mode ?? 'firmware',
    filtering: customConfig?.filtering ?? 'none',
    blockingSweep: customConfig?.blockingSweep ?? true,
    hysteresisLow: customConfig?.hysteresisLow,
    hysteresisHigh: customConfig?.hysteresisHigh,
    debounceTicks: customConfig?.debounceTicks,
  };

  const distances = initialDistances ?? new Array(NUM_SLOTS).fill(TIMEOUT_DISTANCE_CM);

  // Initialize empty slots
  const slots: SlotState[] = [];
  for (let i = 0; i < NUM_SLOTS; i++) {
    slots.push({
      slotIndex: i,
      lane: Math.floor(i / SLOTS_PER_STRIP),
      positionInLane: i % SLOTS_PER_STRIP,
      distance: distances[i] ?? TIMEOUT_DISTANCE_CM,
      occupied: false,
      isTarget: false,
    });
  }

  const initialFrame = buildCompletedFrame(slots, true);

  return {
    slots,
    lastOccupied: new Array(NUM_SLOTS).fill(false),
    needDraw: true,
    blinkOn: true,
    lastBlinkMs: 0,
    lastTickMs: 0,
    blockedUntilMs: 0,
    sweep: null,
    config,
    ledFrame: initialFrame,
    filterState: {
      debounceCounts: new Array(NUM_SLOTS).fill(0),
      candidateOccupied: new Array(NUM_SLOTS).fill(false),
    },
  };
}

/**
 * Checks if strip redraw is required according to firmware stateChanged():
 * if (needDraw) return true;
 * for (int i = 0; i < NUM_SLOTS; i++)
 *   if (slotOccupied[i] != lastOccupied[i]) return true;
 * return false;
 */
export function stateChanged(state: EngineState): boolean {
  if (state.needDraw) return true;
  for (let i = 0; i < NUM_SLOTS; i++) {
    if (state.slots[i].occupied !== state.lastOccupied[i]) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts distance array from either raw number[] or DataSource instance.
 */
function extractDistances(inputs: number[] | DataSource, nowMs: number): number[] {
  if (Array.isArray(inputs)) {
    return inputs;
  }
  return inputs.getAllDistances(nowMs);
}

/**
 * Executes a single discrete cycle of the ESP32 parking firmware loop.
 *
 * Replicates:
 * 1. 15 ms/pixel blocking sweep (sensors are not sampled during sweep execution).
 * 2. classifySlots() -> reads sensors and updates occupancy.
 * 3. findTargets() -> resolves target slots based on configured guidance mode.
 * 4. stateChanged() -> triggers drawStrips() only when occupancy changes or on initial boot.
 * 5. updateBlink() -> toggles target slot visual phase every 300 ms.
 */
export function tick(
  currentState: EngineState,
  inputs: number[] | DataSource,
  nowMs: number,
): { state: EngineState; events: SimEvent[]; ledFrame: LedFrame } {
  // Deep copy mutable state fields
  const state: EngineState = {
    ...currentState,
    slots: currentState.slots.map(s => ({ ...s })),
    lastOccupied: [...currentState.lastOccupied],
    config: { ...currentState.config },
    lastTickMs: nowMs,
  };

  const events: SimEvent[] = [];

  const isBlocking = state.config.blockingSweep !== false;

  // =========================================================================
  // 1. Check if the loop is currently blocked by an in-flight sequential sweep
  // =========================================================================
  if (isBlocking && state.blockedUntilMs > nowMs && state.sweep !== null) {
    // Microcontroller is blocked inside delay(15) loop: sensors are NOT read
    const elapsed = Math.max(0, nowMs - state.sweep.startMs);
    const currentPixel = Math.floor(elapsed / SWEEP_STEP_MS);
    const baseFrame = buildBaseFrame(state.slots);
    const inProgressFrame = buildSweepFrame(
      baseFrame,
      state.slots,
      currentPixel,
      state.sweep.endPixel,
    );
    state.ledFrame = inProgressFrame;

    return { state, events, ledFrame: inProgressFrame };
  }

  // =========================================================================
  // 2. If a sweep just finished, finalize its completion
  // =========================================================================
  if (state.sweep !== null && nowMs >= state.blockedUntilMs) {
    events.push({
      type: 'SWEEP_END',
      timestamp: state.blockedUntilMs,
      description: 'Sequential LED visual guidance sweep completed.',
    });
    state.sweep = null;
    state.needDraw = false;
    state.lastOccupied = state.slots.map(s => s.occupied);
    state.blinkOn = true;
    state.lastBlinkMs = state.blockedUntilMs;
  }

  // =========================================================================
  // 3. Sensor classification: classifySlots()
  // =========================================================================
  const rawDistances = extractDistances(inputs, nowMs);
  const classifyResult = classifySlots(
    rawDistances,
    state.config,
    state.slots,
    state.filterState,
    nowMs,
  );
  state.slots = classifyResult.slots;
  events.push(...classifyResult.events);

  // =========================================================================
  // 4. Target selection: findTargets()
  // =========================================================================
  const prevTargets = currentState.slots.filter(s => s.isTarget).map(s => s.slotIndex);
  const targetResult = selectTargets(state.slots, state.config.mode, prevTargets, nowMs);
  state.slots = targetResult.updatedSlots;
  if (targetResult.event) {
    events.push(targetResult.event);
  }

  // =========================================================================
  // 5. Redraw condition: if (stateChanged()) drawStrips()
  // =========================================================================
  const changed = stateChanged(state);

  if (changed) {
    events.push({
      type: 'REDRAW',
      timestamp: nowMs,
      description: 'Strip redraw triggered due to occupancy state change.',
    });

    const endPixels = calculateEndPixels(state.slots);
    const maxEndPixel = Math.max(endPixels[0], endPixels[1]);
    const sweepDurationMs = maxEndPixel >= 0 ? (maxEndPixel + 1) * SWEEP_STEP_MS : 0;

    events.push({
      type: 'SWEEP_START',
      timestamp: nowMs,
      data: {
        endPixels,
        maxEndPixel,
        durationMs: sweepDurationMs,
      },
      description: `Sequential LED sweep started toward target pixel ${maxEndPixel} (${sweepDurationMs} ms)`,
    });

    if (sweepDurationMs === 0) {
      // No targets to sweep toward (e.g. facility full)
      events.push({
        type: 'SWEEP_END',
        timestamp: nowMs,
        description: 'Sweep finished immediately (no active target path).',
      });
      state.sweep = null;
      state.needDraw = false;
      state.lastOccupied = state.slots.map(s => s.occupied);
      state.blinkOn = true;
      state.lastBlinkMs = nowMs;
      state.blockedUntilMs = nowMs;
      state.ledFrame = buildCompletedFrame(state.slots, state.blinkOn);
    } else {
      const sweepState: SweepState = {
        startMs: nowMs,
        endPixel: endPixels,
        durationMs: sweepDurationMs,
      };
      state.sweep = sweepState;
      state.blockedUntilMs = nowMs + sweepDurationMs;

      // Check if nowMs immediately fulfills the sweep duration
      // (e.g. caller passed time jumping past the sweep)
      if (nowMs >= state.blockedUntilMs) {
        events.push({
          type: 'SWEEP_END',
          timestamp: state.blockedUntilMs,
          description: 'Sequential LED visual guidance sweep completed.',
        });
        state.sweep = null;
        state.needDraw = false;
        state.lastOccupied = state.slots.map(s => s.occupied);
        state.blinkOn = true;
        state.lastBlinkMs = state.blockedUntilMs;
        state.ledFrame = buildCompletedFrame(state.slots, state.blinkOn);
      } else {
        // Sweep currently starting at pixel 0
        const baseFrame = buildBaseFrame(state.slots);
        state.ledFrame = buildSweepFrame(baseFrame, state.slots, 0, endPixels);
      }
    }
  } else {
    // =========================================================================
    // 6. Target blinking: updateBlink()
    // =========================================================================
    // Blinks every BLINK_MS (300 ms)
    if (state.sweep === null) {
      if (nowMs - state.lastBlinkMs >= BLINK_MS) {
        state.blinkOn = !state.blinkOn;
        state.lastBlinkMs = nowMs;
      }
      state.ledFrame = buildCompletedFrame(state.slots, state.blinkOn);
    }
  }

  return { state, events, ledFrame: state.ledFrame };
}

/**
 * Convenience helper to advance the simulation by a fixed time step (default 100 ms).
 */
export function stepTick(
  state: EngineState,
  inputs: number[] | DataSource,
  stepMs = 100,
): { state: EngineState; events: SimEvent[]; ledFrame: LedFrame } {
  return tick(state, inputs, state.lastTickMs + stepMs);
}

/**
 * Steps the engine forward until all active sweeps and state transitions settle.
 */
export function settleEngine(
  initialState: EngineState,
  inputs: number[] | DataSource,
  stepMs = 50,
  maxSteps = 200,
): { state: EngineState; allEvents: SimEvent[]; ledFrame: LedFrame } {
  let current = initialState;
  const allEvents: SimEvent[] = [];
  let steps = 0;

  // Run at least one tick
  let res = tick(current, inputs, current.lastTickMs + stepMs);
  allEvents.push(...res.events);
  current = res.state;

  while ((current.sweep !== null || current.blockedUntilMs > current.lastTickMs) && steps < maxSteps) {
    res = tick(current, inputs, current.lastTickMs + stepMs);
    allEvents.push(...res.events);
    current = res.state;
    steps++;
  }

  return {
    state: current,
    allEvents,
    ledFrame: current.ledFrame,
  };
}
