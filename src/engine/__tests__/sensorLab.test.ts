import { describe, it, expect } from 'vitest';
import {
  NUM_SLOTS,
  classifySlot,
  SimulatedSource,
  FlickerTracker,
  SimConfig,
  EngineFilterState,
} from '../index';

describe('Sensor Lab Engine & Model Extensions', () => {
  // ---------------------------------------------------------------------------
  // 1. SimulatedSource: Ideal vs Realistic Model
  // ---------------------------------------------------------------------------
  describe('Sensor Models (Ideal vs Realistic)', () => {
    it('returns exact target distance in Ideal mode', () => {
      const source = new SimulatedSource([20, 15, 8, 45, 120, 250, 399, 400]);
      source.setModel('ideal');

      expect(source.getModel()).toBe('ideal');
      expect(source.getAllDistances()).toEqual([20, 15, 8, 45, 120, 250, 399, 400]);

      source.setDistance(0, 14);
      expect(source.getDistance(0)).toBe(14);
    });

    it('clamps distances to 2..400 cm in Ideal mode', () => {
      const source = new SimulatedSource();
      source.setModel('ideal');

      source.setDistance(0, -5);
      expect(source.getDistance(0)).toBe(2);

      source.setDistance(1, 450);
      expect(source.getDistance(1)).toBe(400);
    });

    it('generates reproducible Gaussian noise and occasional spikes in Realistic mode with seeded RNG', () => {
      const source1 = new SimulatedSource([50, 50, 50, 50, 50, 50, 50, 50], 9999);
      source1.setModel('realistic');
      const readings1 = source1.getAllDistances();

      // Ensure readings jitter around 50 cm
      expect(readings1.every(d => d >= 2 && d <= 400)).toBe(true);

      // Re-create identical seed and verify deterministic reproducibility
      const source2 = new SimulatedSource([50, 50, 50, 50, 50, 50, 50, 50], 9999);
      source2.setModel('realistic');
      const readings2 = source2.getAllDistances();

      expect(readings1).toEqual(readings2);
    });

    it('returns 400 cm timeout when base distance is >= 400 cm in Realistic mode', () => {
      const source = new SimulatedSource();
      source.setModel('realistic');
      source.setDistance(0, 400);

      expect(source.getDistance(0)).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Fault Injection: Stuck, Disconnected, Noisy
  // ---------------------------------------------------------------------------
  describe('Fault Injection', () => {
    it('returns 400 cm timeout when sensor is disconnected', () => {
      const source = new SimulatedSource([25, 25, 25, 25, 25, 25, 25, 25]);
      source.setFault(0, 'disconnected');

      expect(source.getFault(0)).toBe('disconnected');
      expect(source.getDistance(0)).toBe(400);

      // Setting new base distance does not bypass disconnected timeout return
      source.setDistance(0, 8);
      expect(source.getDistance(0)).toBe(400);
      expect(source.getBaseDistance(0)).toBe(8);
    });

    it('locks sensor reading when stuck fault is injected', () => {
      const source = new SimulatedSource([12, 25, 25, 25, 25, 25, 25, 25]);
      source.setFault(0, 'stuck', 12);

      expect(source.getFault(0)).toBe('stuck');
      expect(source.getDistance(0)).toBe(12);

      // Even if physical vehicle distance changes to 150 cm, stuck sensor reads 12 cm
      source.setDistance(0, 150);
      expect(source.getBaseDistance(0)).toBe(150);
      expect(source.getDistance(0)).toBe(12);
    });

    it('injects heavy jitter in noisy mode', () => {
      const source = new SimulatedSource([25, 25, 25, 25, 25, 25, 25, 25], 42);
      source.setFault(1, 'noisy');

      expect(source.getFault(1)).toBe('noisy');
      const samples: number[] = [];
      for (let i = 0; i < 20; i++) {
        samples.push(source.getDistance(1));
      }

      // Check that samples deviate from the base 25 cm
      const hasDeviation = samples.some(d => d !== 25);
      expect(hasDeviation).toBe(true);
    });

    it('clears faults when resetFaults() is called', () => {
      const source = new SimulatedSource([25, 25, 25, 25, 25, 25, 25, 25]);
      source.setFault(0, 'disconnected');
      source.setFault(1, 'stuck', 5);
      source.setFault(2, 'noisy');

      source.resetFaults();
      expect(source.getAllFaults().every(f => f === 'none')).toBe(true);
      expect(source.getDistance(0)).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Filtering Modes: None vs Debounce vs Hysteresis
  // ---------------------------------------------------------------------------
  describe('Signal Filtering Modes', () => {
    it('applies firmware direct threshold in None mode (< 15 cm rule)', () => {
      const config: SimConfig = { threshold: 15, mode: 'firmware', filtering: 'none' };

      expect(classifySlot(0, 14, false, config).occupied).toBe(true);
      expect(classifySlot(0, 15, false, config).occupied).toBe(false);
      expect(classifySlot(0, 16, true, config).occupied).toBe(false);
    });

    it('suppresses transient noise spikes in Debounce mode (requires N consecutive reads)', () => {
      const config: SimConfig = {
        threshold: 15,
        mode: 'firmware',
        filtering: 'debounce',
        debounceTicks: 3,
      };

      const filterState: EngineFilterState = {
        debounceCounts: [0],
        candidateOccupied: [false],
      };

      let currentOccupied = false;

      // Tick 1: transient spike to 10 cm (raw occupied)
      let res = classifySlot(0, 10, currentOccupied, config, filterState);
      expect(res.occupied).toBe(false); // not yet 3 ticks
      currentOccupied = res.occupied;

      // Tick 2: reading returns to 25 cm (vacant)
      res = classifySlot(0, 25, currentOccupied, config, filterState);
      expect(res.occupied).toBe(false);
      currentOccupied = res.occupied;

      // Now provide 3 consecutive reads of 10 cm
      res = classifySlot(0, 10, currentOccupied, config, filterState);
      expect(res.occupied).toBe(false); // tick 1
      currentOccupied = res.occupied;

      res = classifySlot(0, 10, currentOccupied, config, filterState);
      expect(res.occupied).toBe(false); // tick 2
      currentOccupied = res.occupied;

      res = classifySlot(0, 10, currentOccupied, config, filterState);
      expect(res.occupied).toBe(true); // tick 3: confirmed transition!
    });

    it('implements Hysteresis (15 occupy, 18 vacate) deadband', () => {
      const config: SimConfig = {
        threshold: 15,
        mode: 'firmware',
        filtering: 'hysteresis',
        hysteresisLow: 15,
        hysteresisHigh: 18,
      };

      let currentOccupied = false;

      // Initially vacant at 20 cm
      let res = classifySlot(0, 20, currentOccupied, config);
      expect(res.occupied).toBe(false);
      currentOccupied = res.occupied;

      // Vehicle approaches at 16 cm (>= 15): remains vacant
      res = classifySlot(0, 16, currentOccupied, config);
      expect(res.occupied).toBe(false);
      currentOccupied = res.occupied;

      // Vehicle enters at 14 cm (< 15): transitions to OCCUPIED
      res = classifySlot(0, 14, currentOccupied, config);
      expect(res.occupied).toBe(true);
      currentOccupied = res.occupied;

      // Sensor jitters to 15, 16, 17 cm (< 18): STAYS OCCUPIED (no flicker!)
      res = classifySlot(0, 15, currentOccupied, config);
      expect(res.occupied).toBe(true);

      res = classifySlot(0, 16, currentOccupied, config);
      expect(res.occupied).toBe(true);

      res = classifySlot(0, 17, currentOccupied, config);
      expect(res.occupied).toBe(true);
      currentOccupied = res.occupied;

      // Vehicle departs, distance reaches 18 cm (>= 18): transitions to VACANT
      res = classifySlot(0, 18, currentOccupied, config);
      expect(res.occupied).toBe(false);
      currentOccupied = res.occupied;

      // Distance jitters between 15..17 cm while vacant: STAYS VACANT
      res = classifySlot(0, 16, currentOccupied, config);
      expect(res.occupied).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. FlickerTracker: Cross-Mode Comparison
  // ---------------------------------------------------------------------------
  describe('FlickerTracker Cross-Mode Benchmark', () => {
    it('detects high flicker on raw threshold while debounce and hysteresis suppress it', () => {
      const initial = [25, 25, 25, 25, 25, 25, 25, 25];
      const tracker = new FlickerTracker(initial, 15);

      // Oscillate Slot 0 across 14 cm and 16 cm for 10 cycles
      for (let i = 0; i < 10; i++) {
        tracker.record([14, 25, 25, 25, 25, 25, 25, 25], 15, 3, 15, 18);
        tracker.record([16, 25, 25, 25, 25, 25, 25, 25], 15, 3, 15, 18);
      }

      const metrics = tracker.getMetrics();

      // None mode toggled back and forth 20 times!
      expect(metrics.none).toBe(20);

      // Debounce mode never stayed in candidate state for 3 consecutive reads -> 0 flickers
      expect(metrics.debounce).toBe(0);

      // Hysteresis mode occupies on first drop to 14, but never vacates at 16 (< 18) -> 1 initial transition
      expect(metrics.hysteresis).toBe(1);

      expect(metrics.perSlot.none[0]).toBe(20);
      expect(metrics.perSlot.none[1]).toBe(0);
    });

    it('resets flicker metrics cleanly', () => {
      const tracker = new FlickerTracker([25, 25, 25, 25, 25, 25, 25, 25], 15);
      tracker.record([14, 25, 25, 25, 25, 25, 25, 25], 15);
      tracker.record([16, 25, 25, 25, 25, 25, 25, 25], 15);

      expect(tracker.getMetrics().none).toBeGreaterThan(0);

      tracker.reset([25, 25, 25, 25, 25, 25, 25, 25], 15);
      const resetMetrics = tracker.getMetrics();
      expect(resetMetrics.none).toBe(0);
      expect(resetMetrics.debounce).toBe(0);
      expect(resetMetrics.hysteresis).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Reset Defaults
  // ---------------------------------------------------------------------------
  describe('Reset Lab Defaults', () => {
    it('restores initial values on resetDefaults()', () => {
      const source = new SimulatedSource([10, 10, 10, 10, 10, 10, 10, 10]);
      source.setModel('realistic');
      source.setFault(3, 'disconnected');
      source.setFault(5, 'stuck', 12);

      source.resetDefaults();

      expect(source.getModel()).toBe('ideal');
      expect(source.getAllFaults().every(f => f === 'none')).toBe(true);
      expect(source.getAllDistances()).toEqual(new Array(NUM_SLOTS).fill(25));
    });
  });
});
