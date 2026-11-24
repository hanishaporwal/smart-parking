import { describe, it, expect } from 'vitest';
import {
  PIXELS_PER_SLOT,
  COLOR_RED,
  COLOR_GREEN,
  COLOR_DIM,
  COLOR_OFF,
  isColorEqual,
  classifySlot,
  classifySlots,
  normalizeDistance,
  selectTargets,
  buildBaseFrame,
  buildSweepFrame,
  calculateEndPixels,
  createInitialEngineState,
  tick,
  settleEngine,
  toStatusJson,
  SimulatedSource,
  SlotState,
  SimConfig,
} from '../index';

describe('ParkWay Simulation Engine', () => {
  // ---------------------------------------------------------------------------
  // 1. Classification & Boundary Tests
  // ---------------------------------------------------------------------------
  describe('Sensor Classification & Boundary Conditions', () => {
    const defaultConfig: SimConfig = {
      threshold: 15,
      mode: 'firmware',
      filtering: 'none',
    };

    it('classifies 14 cm as occupied and 15 cm as vacant (< 15 cm rule)', () => {
      const res14 = classifySlot(0, 14, false, defaultConfig);
      expect(res14.occupied).toBe(true);
      expect(res14.distance).toBe(14);

      const res15 = classifySlot(0, 15, false, defaultConfig);
      expect(res15.occupied).toBe(false);
      expect(res15.distance).toBe(15);

      const res16 = classifySlot(0, 16, false, defaultConfig);
      expect(res16.occupied).toBe(false);
      expect(res16.distance).toBe(16);
    });

    it('handles timeout distance 400 cm as vacant', () => {
      const res400 = classifySlot(0, 400, false, defaultConfig);
      expect(res400.occupied).toBe(false);
      expect(res400.distance).toBe(400);

      // 0 or negative timeouts normalize to 400 cm
      expect(normalizeDistance(0)).toBe(400);
      expect(normalizeDistance(-10)).toBe(400);
      expect(normalizeDistance(450)).toBe(400);

      const res0 = classifySlot(0, 0, false, defaultConfig);
      expect(res0.occupied).toBe(false);
      expect(res0.distance).toBe(400);
    });

    it('emits SENSOR_READING, SLOT_OCCUPIED and SLOT_VACATED events', () => {
      const initialDistances = [20, 20, 20, 20, 20, 20, 20, 20];
      const initial = classifySlots(initialDistances, defaultConfig);
      expect(initial.slots.every(s => !s.occupied)).toBe(true);

      // Car drives into Slot 0 (distance drops from 20 to 8 cm)
      const newDistances = [8, 20, 20, 20, 20, 20, 20, 20];
      const step2 = classifySlots(newDistances, defaultConfig, initial.slots, undefined, 100);

      expect(step2.slots[0].occupied).toBe(true);
      const occupiedEvent = step2.events.find(e => e.type === 'SLOT_OCCUPIED');
      expect(occupiedEvent).toBeDefined();
      expect(occupiedEvent?.slotIndex).toBe(0);

      // Car leaves Slot 0 (distance goes back to 25 cm)
      const step3Distances = [25, 20, 20, 20, 20, 20, 20, 20];
      const step3 = classifySlots(step3Distances, defaultConfig, step2.slots, undefined, 200);

      expect(step3.slots[0].occupied).toBe(false);
      const vacatedEvent = step3.events.find(e => e.type === 'SLOT_VACATED');
      expect(vacatedEvent).toBeDefined();
      expect(vacatedEvent?.slotIndex).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Target Selection Logic
  // ---------------------------------------------------------------------------
  describe('Target Selection Logic (firmware vs perLane)', () => {
    function makeSlots(occupancy: boolean[]): SlotState[] {
      return occupancy.map((occupied, idx) => ({
        slotIndex: idx,
        lane: Math.floor(idx / 4),
        positionInLane: idx % 4,
        distance: occupied ? 10 : 30,
        occupied,
        isTarget: false,
      }));
    }

    it('selects global-minimum relative position in firmware mode and blinks ties across lanes', () => {
      // Both S1 (lane 0 pos 0) and S5 (lane 1 pos 0) are vacant.
      // S2, S3, S4, S6, S7, S8 are occupied.
      const slots = makeSlots([false, true, true, true, false, true, true, true]);
      const result = selectTargets(slots, 'firmware');

      // Ties at position 0 across lanes: both S1 (0) and S5 (4) must be targets
      expect(result.targets).toEqual([0, 4]);
      expect(result.updatedSlots[0].isTarget).toBe(true);
      expect(result.updatedSlots[4].isTarget).toBe(true);
      expect(result.updatedSlots[1].isTarget).toBe(false);
    });

    it('prefers lower relative position in firmware mode across lanes', () => {
      // Lane 0: S1 occupied (pos 0), S2 vacant (pos 1), S3 occupied, S4 vacant
      // Lane 1: S5 vacant (pos 0), S6 occupied, S7 occupied, S8 vacant
      // Relative positions: S2 is pos 1, S5 is pos 0. Global min is pos 0.
      const slots = makeSlots([true, false, true, false, false, true, true, false]);
      const result = selectTargets(slots, 'firmware');

      // In firmware mode, only S5 (pos 0) is selected because 0 < 1
      expect(result.targets).toEqual([4]);
      expect(result.updatedSlots[4].isTarget).toBe(true);
      expect(result.updatedSlots[1].isTarget).toBe(false);
    });

    it('selects targets independently in perLane mode', () => {
      // Same scenario: Lane 0 has S2 vacant (pos 1); Lane 1 has S5 vacant (pos 0)
      const slots = makeSlots([true, false, true, false, false, true, true, false]);
      const result = selectTargets(slots, 'perLane');

      // In perLane mode, Lane 0 targets S2 (pos 1) AND Lane 1 targets S5 (pos 0)
      expect(result.targets).toEqual([1, 4]);
      expect(result.updatedSlots[1].isTarget).toBe(true);
      expect(result.updatedSlots[4].isTarget).toBe(true);
    });

    it('handles all slots occupied with 0 targets', () => {
      const slots = makeSlots([true, true, true, true, true, true, true, true]);
      const resFirmware = selectTargets(slots, 'firmware');
      expect(resFirmware.targets).toEqual([]);

      const resPerLane = selectTargets(slots, 'perLane');
      expect(resPerLane.targets).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. LED Rendering & Red Preservation
  // ---------------------------------------------------------------------------
  describe('LED Strip Rendering & Red Preservation', () => {
    it('base frame renders occupied as red (255,0,0) and vacant as dim green (0,200,0)', () => {
      const slots: SlotState[] = [
        { slotIndex: 0, lane: 0, positionInLane: 0, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 1, lane: 0, positionInLane: 1, distance: 30, occupied: false, isTarget: false },
        { slotIndex: 2, lane: 0, positionInLane: 2, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 3, lane: 0, positionInLane: 3, distance: 30, occupied: false, isTarget: false },
        { slotIndex: 4, lane: 1, positionInLane: 0, distance: 30, occupied: false, isTarget: false },
        { slotIndex: 5, lane: 1, positionInLane: 1, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 6, lane: 1, positionInLane: 2, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 7, lane: 1, positionInLane: 3, distance: 30, occupied: false, isTarget: false },
      ];

      const base = buildBaseFrame(slots);

      // Slot 0 (lane 0, pixels 0..24) must be solid red
      for (let p = 0; p < PIXELS_PER_SLOT; p++) {
        expect(isColorEqual(base[0][p], COLOR_RED)).toBe(true);
      }

      // Slot 1 (lane 0, pixels 25..49) must be dim green
      for (let p = 25; p < 50; p++) {
        expect(isColorEqual(base[0][p], COLOR_DIM)).toBe(true);
      }
    });

    it('strictly preserves red zones during sequential sweep (never overwrites red)', () => {
      // Scenario:
      // S1 (pixels 0..24) is OCCUPIED.
      // S2 (pixels 25..49) is VACANT & TARGET.
      // Sequential sweep runs from pixel 0 to 49 on strip 0.
      const slots: SlotState[] = [
        { slotIndex: 0, lane: 0, positionInLane: 0, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 1, lane: 0, positionInLane: 1, distance: 30, occupied: false, isTarget: true },
        { slotIndex: 2, lane: 0, positionInLane: 2, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 3, lane: 0, positionInLane: 3, distance: 30, occupied: false, isTarget: false },
        { slotIndex: 4, lane: 1, positionInLane: 0, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 5, lane: 1, positionInLane: 1, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 6, lane: 1, positionInLane: 2, distance: 10, occupied: true, isTarget: false },
        { slotIndex: 7, lane: 1, positionInLane: 3, distance: 10, occupied: true, isTarget: false },
      ];

      const base = buildBaseFrame(slots);
      const endPixels = calculateEndPixels(slots);
      expect(endPixels[0]).toBe(49); // end of S2
      expect(endPixels[1]).toBe(-1); // no target on lane 1

      // Sweep through the entire strip up to pixel 49
      const sweptFrame = buildSweepFrame(base, slots, 49, endPixels);

      // Pixels 0..24 belong to occupied Slot 0: MUST REMAIN RED
      for (let p = 0; p < 25; p++) {
        expect(isColorEqual(sweptFrame[0][p], COLOR_RED)).toBe(true);
      }

      // Pixels 25..49 belong to vacant Slot 1: MUST BE BRIGHT GREEN
      for (let p = 25; p < 50; p++) {
        expect(isColorEqual(sweptFrame[0][p], COLOR_GREEN)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Engine Tick, State Changed & Blocking Sweep
  // ---------------------------------------------------------------------------
  describe('Engine Loop & State Transitions', () => {
    it('triggers redraw only on occupancy change', () => {
      const state = createInitialEngineState();
      const distances1 = [50, 50, 50, 50, 50, 50, 50, 50]; // all vacant

      // First tick boot-up: needDraw = true -> triggers REDRAW
      const step1 = tick(state, distances1, 0);
      expect(step1.events.some(e => e.type === 'REDRAW')).toBe(true);

      // Settle the initial sweep
      const settled = settleEngine(step1.state, distances1);
      expect(settled.state.sweep).toBeNull();

      // Subsequent tick with identical occupancy: NO REDRAW
      const stepAfterSettle = tick(settled.state, distances1, settled.state.lastTickMs + 100);
      expect(stepAfterSettle.events.some(e => e.type === 'REDRAW')).toBe(false);

      // Distance changes slightly (50 cm -> 40 cm), but slot remains vacant: NO REDRAW
      const slightChange = [40, 50, 50, 50, 50, 50, 50, 50];
      const stepSlight = tick(stepAfterSettle.state, slightChange, stepAfterSettle.state.lastTickMs + 100);
      expect(stepSlight.events.some(e => e.type === 'REDRAW')).toBe(false);

      // Occupancy changes (Slot 0 drops to 5 cm -> occupied): TRIGGERS REDRAW!
      const occupiedChange = [5, 50, 50, 50, 50, 50, 50, 50];
      const stepOccupied = tick(stepSlight.state, occupiedChange, stepSlight.state.lastTickMs + 100);
      expect(stepOccupied.events.some(e => e.type === 'REDRAW')).toBe(true);
      expect(stepOccupied.events.some(e => e.type === 'SWEEP_START')).toBe(true);
    });

    it('blocks sensor sampling during the 15 ms/pixel sweep', () => {
      const state = createInitialEngineState();
      // Slot 0 vacant, so target is Slot 0 (pixel 24). Sweep duration = (24 + 1) * 15 = 375 ms
      const distances = [50, 10, 10, 10, 10, 10, 10, 10];
      const step1 = tick(state, distances, 0);

      expect(step1.state.blockedUntilMs).toBe(375);
      expect(step1.state.sweep).not.toBeNull();

      // At t = 100 ms, loop is still blocked inside delay(15)
      // New sensor readings must be IGNORED while blocked
      const modifiedDistances = [10, 50, 10, 10, 10, 10, 10, 10];
      const blockedStep = tick(step1.state, modifiedDistances, 100);

      // Slot 0 should still be vacant in state because sensors were not read
      expect(blockedStep.state.slots[0].occupied).toBe(false);
      expect(blockedStep.state.sweep).not.toBeNull();
      // No sensor reading events while blocked
      expect(blockedStep.events.length).toBe(0);

      // At t = 400 ms (> 375 ms), sweep unblocks and samples new values
      const unblockedStep = tick(blockedStep.state, modifiedDistances, 400);
      expect(unblockedStep.events.some(e => e.type === 'SWEEP_END')).toBe(true);
      expect(unblockedStep.state.slots[0].occupied).toBe(true);
      expect(unblockedStep.state.slots[1].occupied).toBe(false);
    });

    it('toggles target zone blink state every 300 ms without altering non-target slots', () => {
      const distances = [50, 10, 10, 10, 10, 10, 10, 10]; // S1 target, others occupied
      const initial = createInitialEngineState();
      const settled = settleEngine(initial, distances);

      expect(settled.state.slots[0].isTarget).toBe(true);
      expect(settled.state.blinkOn).toBe(true);

      const baseTime = settled.state.lastTickMs;

      // At +200 ms: blink should not have toggled yet (< 300 ms)
      const tick200 = tick(settled.state, distances, baseTime + 200);
      expect(tick200.state.blinkOn).toBe(true);

      // At +300 ms: blink toggles to false (OFF)
      const tick300 = tick(settled.state, distances, baseTime + 300);
      expect(tick300.state.blinkOn).toBe(false);
      // Target slot 0 is OFF
      for (let p = 0; p < 25; p++) {
        expect(isColorEqual(tick300.ledFrame[0][p], COLOR_OFF)).toBe(true);
      }
      // Occupied slot 1 remains strictly RED
      for (let p = 25; p < 50; p++) {
        expect(isColorEqual(tick300.ledFrame[0][p], COLOR_RED)).toBe(true);
      }

      // At +600 ms: blink toggles back to true (BRIGHT GREEN)
      const tick600 = tick(tick300.state, distances, baseTime + 600);
      expect(tick600.state.blinkOn).toBe(true);
      for (let p = 0; p < 25; p++) {
        expect(isColorEqual(tick600.ledFrame[0][p], COLOR_GREEN)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Exact Wokwi Screenshot Scenario
  // ---------------------------------------------------------------------------
  describe('Wokwi Screenshot Verification Scenario', () => {
    it('faithfully reproduces the exact state from the Wokwi screenshot', () => {
      // Configuration from reference/wokwi_diagram.png:
      // Lane 0:
      //   S1 (slot 0): OCCUPIED (distance = 10 cm < 15) -> RED
      //   S2 (slot 1): VACANT   (distance = 25 cm >= 15) -> TARGET (pos 1) -> GREEN
      //   S3 (slot 2): OCCUPIED (distance = 8 cm < 15) -> RED
      //   S4 (slot 3): VACANT   (distance = 30 cm >= 15) -> DIM GREEN
      // Lane 1:
      //   S5 (slot 4): OCCUPIED (distance = 12 cm < 15) -> RED
      //   S6 (slot 5): OCCUPIED (distance = 7 cm < 15) -> RED
      //   S7 (slot 6): OCCUPIED (distance = 9 cm < 15) -> RED
      //   S8 (slot 7): VACANT   (distance = 35 cm >= 15) -> DIM GREEN
      const wokwiDistances = [10, 25, 8, 30, 12, 7, 9, 35];

      const initial = createInitialEngineState({ mode: 'firmware', threshold: 15 });
      const { state, ledFrame } = settleEngine(initial, wokwiDistances);

      // Verify slot occupancy
      expect(state.slots[0].occupied).toBe(true);  // S1
      expect(state.slots[1].occupied).toBe(false); // S2
      expect(state.slots[2].occupied).toBe(true);  // S3
      expect(state.slots[3].occupied).toBe(false); // S4
      expect(state.slots[4].occupied).toBe(true);  // S5
      expect(state.slots[5].occupied).toBe(true);  // S6
      expect(state.slots[6].occupied).toBe(true);  // S7
      expect(state.slots[7].occupied).toBe(false); // S8

      // Verify target selection in firmware mode:
      // Vacant slots are: S2 (pos 1), S4 (pos 3), S8 (pos 3)
      // Global minimum relative position is min(1, 3, 3) = 1.
      // S2 is the ONLY slot with position 1.
      expect(state.slots[1].isTarget).toBe(true);
      expect(state.slots[3].isTarget).toBe(false);
      expect(state.slots[7].isTarget).toBe(false);

      // Verify LED frame exactly matches Wokwi visual display:
      // Strip 1 (Lane 0):
      // - Pixels 0..24 (S1): Solid Red (occupied)
      for (let p = 0; p < 25; p++) {
        expect(isColorEqual(ledFrame[0][p], COLOR_RED)).toBe(true);
      }
      // - Pixels 25..49 (S2): Target zone (Bright Green when blinkOn=true)
      for (let p = 25; p < 50; p++) {
        expect(isColorEqual(ledFrame[0][p], COLOR_GREEN)).toBe(true);
      }
      // - Pixels 50..74 (S3): Solid Red (occupied)
      for (let p = 50; p < 75; p++) {
        expect(isColorEqual(ledFrame[0][p], COLOR_RED)).toBe(true);
      }
      // - Pixels 75..99 (S4): Dim Green (vacant non-target)
      for (let p = 75; p < 100; p++) {
        expect(isColorEqual(ledFrame[0][p], COLOR_DIM)).toBe(true);
      }

      // Strip 2 (Lane 1):
      // - Pixels 0..24 (S5): Solid Red
      for (let p = 0; p < 25; p++) {
        expect(isColorEqual(ledFrame[1][p], COLOR_RED)).toBe(true);
      }
      // - Pixels 25..49 (S6): Solid Red
      for (let p = 25; p < 50; p++) {
        expect(isColorEqual(ledFrame[1][p], COLOR_RED)).toBe(true);
      }
      // - Pixels 50..74 (S7): Solid Red
      for (let p = 50; p < 75; p++) {
        expect(isColorEqual(ledFrame[1][p], COLOR_RED)).toBe(true);
      }
      // - Pixels 75..99 (S8): Dim Green (vacant non-target)
      for (let p = 75; p < 100; p++) {
        expect(isColorEqual(ledFrame[1][p], COLOR_DIM)).toBe(true);
      }

      // Verify telemetry JSON response matches GET /status contract
      const statusJson = toStatusJson(state);
      expect(statusJson.targets).toEqual([1]);
      expect(statusJson.slots).toHaveLength(8);
      expect(statusJson.slots[0]).toEqual({ occupied: true, distance: 10 });
      expect(statusJson.slots[1]).toEqual({ occupied: false, distance: 25 });
      expect(statusJson.slots[2]).toEqual({ occupied: true, distance: 8 });
      expect(statusJson.slots[3]).toEqual({ occupied: false, distance: 30 });
      expect(statusJson.slots[4]).toEqual({ occupied: true, distance: 12 });
      expect(statusJson.slots[5]).toEqual({ occupied: true, distance: 7 });
      expect(statusJson.slots[6]).toEqual({ occupied: true, distance: 9 });
      expect(statusJson.slots[7]).toEqual({ occupied: false, distance: 35 });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. DataSource & SimulatedSource
  // ---------------------------------------------------------------------------
  describe('SimulatedSource Data Provider', () => {
    it('sets and retrieves distance with seeded noise reproducibility', () => {
      const source = new SimulatedSource([20, 20, 20, 20, 20, 20, 20, 20], 12345);
      expect(source.getAllDistances()).toEqual([20, 20, 20, 20, 20, 20, 20, 20]);

      source.setDistance(2, 9);
      expect(source.getDistance(2)).toBe(9);

      // Add noise
      source.addNoise(2);
      const withNoise1 = source.getAllDistances();

      // Reset seed and verify noise reproducibility
      source.resetSeed(12345);
      source.setAllDistances([20, 20, 9, 20, 20, 20, 20, 20]);
      source.addNoise(2);
      const withNoise2 = source.getAllDistances();

      expect(withNoise1).toEqual(withNoise2);
    });
  });
});
