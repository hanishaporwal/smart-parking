import { NUM_SLOTS, TIMEOUT_DISTANCE_CM, DataSource, SensorModel, SensorFault } from '../types';

/**
 * Seedable linear congruential generator for deterministic simulation testing.
 */
export function createLcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Box-Muller transform for standard Gaussian random variates.
 */
export function sampleGaussian(rng: () => number, mean = 0, stdDev = 1): number {
  let u1 = rng();
  const u2 = rng();
  while (u1 <= 1e-10) {
    u1 = rng();
  }
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

export class SimulatedSource implements DataSource {
  private distances: number[]; // Ground truth base distances (cm)
  private faults: SensorFault[];
  private stuckValues: number[];
  private model: SensorModel;
  private rng: () => number;
  private seed: number;

  constructor(initialDistances?: number[], seed = 42) {
    this.seed = seed;
    this.rng = createLcg(seed);
    this.model = 'ideal';
    this.faults = new Array(NUM_SLOTS).fill('none');
    this.stuckValues = new Array(NUM_SLOTS).fill(25);

    if (initialDistances && initialDistances.length === NUM_SLOTS) {
      this.distances = initialDistances.map(d => Math.round(d));
      this.stuckValues = [...this.distances];
    } else {
      // Default: all slots vacant at 50 cm
      this.distances = new Array(NUM_SLOTS).fill(50);
      this.stuckValues = new Array(NUM_SLOTS).fill(50);
    }
  }

  // ---------------------------------------------------------------------------
  // Model & Fault Configuration
  // ---------------------------------------------------------------------------

  getModel(): SensorModel {
    return this.model;
  }

  setModel(model: SensorModel): void {
    this.model = model;
  }

  getFault(slotIndex: number): SensorFault {
    return this.faults[slotIndex] ?? 'none';
  }

  getAllFaults(): SensorFault[] {
    return [...this.faults];
  }

  setFault(slotIndex: number, fault: SensorFault, stuckValue?: number): void {
    if (slotIndex >= 0 && slotIndex < NUM_SLOTS) {
      this.faults[slotIndex] = fault;
      if (fault === 'stuck') {
        this.stuckValues[slotIndex] = stuckValue !== undefined
          ? Math.round(Math.max(2, Math.min(400, stuckValue)))
          : this.distances[slotIndex];
      }
    }
  }

  setAllFaults(fault: SensorFault): void {
    for (let i = 0; i < NUM_SLOTS; i++) {
      this.setFault(i, fault);
    }
  }

  resetFaults(): void {
    this.faults.fill('none');
  }

  getStuckValues(): number[] {
    return [...this.stuckValues];
  }

  // ---------------------------------------------------------------------------
  // Distance Getters & Setters
  // ---------------------------------------------------------------------------

  getBaseDistance(slotIndex: number): number {
    if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
      return TIMEOUT_DISTANCE_CM;
    }
    return this.distances[slotIndex];
  }

  getBaseDistances(): number[] {
    return [...this.distances];
  }

  setBaseDistance(slotIndex: number, distanceCm: number): void {
    this.setDistance(slotIndex, distanceCm);
  }

  setDistance(slotIndex: number, distanceCm: number): void {
    if (slotIndex >= 0 && slotIndex < NUM_SLOTS) {
      const clamped = Math.round(Math.max(2, Math.min(TIMEOUT_DISTANCE_CM, distanceCm)));
      this.distances[slotIndex] = clamped;
      if (this.faults[slotIndex] !== 'stuck') {
        this.stuckValues[slotIndex] = clamped;
      }
    }
  }

  setAllDistances(distances: number[]): void {
    for (let i = 0; i < NUM_SLOTS; i++) {
      const d = distances[i] ?? TIMEOUT_DISTANCE_CM;
      this.setDistance(i, d);
    }
  }

  /**
   * Evaluates the simulated distance reading for a single sensor slot,
   * factoring in sensor model (ideal vs realistic) and fault injection.
   */
  getDistance(slotIndex: number, _nowMs?: number): number {
    if (slotIndex < 0 || slotIndex >= NUM_SLOTS) {
      return TIMEOUT_DISTANCE_CM;
    }

    const fault = this.faults[slotIndex];

    // 1. Fault Handling
    if (fault === 'disconnected') {
      return TIMEOUT_DISTANCE_CM; // HC-SR04 pulse timeout: 400 cm
    }

    if (fault === 'stuck') {
      return this.stuckValues[slotIndex] ?? this.distances[slotIndex];
    }

    const base = this.distances[slotIndex];

    if (fault === 'noisy') {
      // Severe jitter and dropouts
      const roll = this.rng();
      if (roll < 0.10) {
        return TIMEOUT_DISTANCE_CM; // 10% echo dropout
      }
      if (roll < 0.20) {
        // Large erratic spike (+20..50 cm or -20 cm)
        const spike = (this.rng() * 70 - 20);
        return Math.max(2, Math.min(TIMEOUT_DISTANCE_CM, Math.round(base + spike)));
      }
      // Gaussian noise with large std dev (8 cm)
      const noise = sampleGaussian(this.rng, 0, 8);
      return Math.max(2, Math.min(TIMEOUT_DISTANCE_CM, Math.round(base + noise)));
    }

    // 2. Normal Operation: Ideal vs Realistic Model
    if (this.model === 'ideal') {
      return base >= TIMEOUT_DISTANCE_CM ? TIMEOUT_DISTANCE_CM : Math.max(2, Math.round(base));
    }

    // Realistic HC-SR04 Model:
    // - Base distance >= 400 is out of range / timeout
    if (base >= TIMEOUT_DISTANCE_CM) {
      return TIMEOUT_DISTANCE_CM;
    }

    // - Occasional ultrasonic spikes / multipath echo issues
    const roll = this.rng();
    if (roll < 0.015) {
      // 1.5% chance of echo loss / timeout
      return TIMEOUT_DISTANCE_CM;
    }
    if (roll < 0.035) {
      // 2% chance of multipath / oblique angle reflection spike (+25 to +60 cm)
      const spike = 25 + Math.round(this.rng() * 35);
      return Math.min(TIMEOUT_DISTANCE_CM, Math.round(base + spike));
    }

    // - Regular physical jitter: Gaussian noise (mean 0, stdDev ~1.2 cm)
    const jitter = sampleGaussian(this.rng, 0, 1.2);
    const reading = Math.round(base + jitter);
    return Math.max(2, Math.min(TIMEOUT_DISTANCE_CM, reading));
  }

  getAllDistances(nowMs?: number): number[] {
    const res: number[] = new Array(NUM_SLOTS);
    for (let i = 0; i < NUM_SLOTS; i++) {
      res[i] = this.getDistance(i, nowMs);
    }
    return res;
  }

  // ---------------------------------------------------------------------------
  // Resets & Utility
  // ---------------------------------------------------------------------------

  resetSeed(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed;
    }
    this.rng = createLcg(this.seed);
  }

  resetDefaults(): void {
    this.model = 'ideal';
    this.faults.fill('none');
    this.distances.fill(25);
    this.stuckValues.fill(25);
    this.resetSeed(this.seed);
  }

  /**
   * Injects reproducible Gaussian-like jitter around current base distances.
   * Maintained for backward compatibility with initial tests.
   */
  addNoise(maxJitterCm = 1): void {
    for (let i = 0; i < NUM_SLOTS; i++) {
      if (this.distances[i] >= TIMEOUT_DISTANCE_CM) continue;
      const jitter = (this.rng() * 2 - 1) * maxJitterCm;
      this.distances[i] = Math.max(2, Math.round(this.distances[i] + jitter));
    }
  }
}
