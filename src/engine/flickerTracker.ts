import { NUM_SLOTS, TIMEOUT_DISTANCE_CM, EngineFilterState } from './types';
import { normalizeDistance } from './classify';

export interface FlickerMetrics {
  none: number;
  debounce: number;
  hysteresis: number;
  perSlot: {
    none: number[];
    debounce: number[];
    hysteresis: number[];
  };
}

/**
 * Shadow evaluator that tracks and compares occupancy state flicker (bounces)
 * across None (firmware raw), Debounce (N ticks), and Hysteresis (15 occupy, 18 vacate).
 */
export class FlickerTracker {
  private counts = { none: 0, debounce: 0, hysteresis: 0 };
  private slotCounts = {
    none: new Array(NUM_SLOTS).fill(0),
    debounce: new Array(NUM_SLOTS).fill(0),
    hysteresis: new Array(NUM_SLOTS).fill(0),
  };
  private prevStates = {
    none: new Array(NUM_SLOTS).fill(false),
    debounce: new Array(NUM_SLOTS).fill(false),
    hysteresis: new Array(NUM_SLOTS).fill(false),
  };
  private debounceFilterState: EngineFilterState = {
    debounceCounts: new Array(NUM_SLOTS).fill(0),
    candidateOccupied: new Array(NUM_SLOTS).fill(false),
  };
  private initialized = false;

  constructor(initialDistances?: number[], threshold = 15) {
    if (initialDistances && initialDistances.length === NUM_SLOTS) {
      this.initFromDistances(initialDistances, threshold);
    }
  }

  private initFromDistances(distances: number[], threshold: number): void {
    for (let i = 0; i < NUM_SLOTS; i++) {
      const d = normalizeDistance(distances[i] ?? TIMEOUT_DISTANCE_CM);
      const occ = d < threshold;
      this.prevStates.none[i] = occ;
      this.prevStates.debounce[i] = occ;
      this.prevStates.hysteresis[i] = occ;
      this.debounceFilterState.candidateOccupied[i] = occ;
      this.debounceFilterState.debounceCounts[i] = 0;
    }
    this.initialized = true;
  }

  reset(initialDistances?: number[], threshold = 15): void {
    this.counts = { none: 0, debounce: 0, hysteresis: 0 };
    this.slotCounts = {
      none: new Array(NUM_SLOTS).fill(0),
      debounce: new Array(NUM_SLOTS).fill(0),
      hysteresis: new Array(NUM_SLOTS).fill(0),
    };
    if (initialDistances && initialDistances.length === NUM_SLOTS) {
      this.initFromDistances(initialDistances, threshold);
    } else {
      this.prevStates = {
        none: new Array(NUM_SLOTS).fill(false),
        debounce: new Array(NUM_SLOTS).fill(false),
        hysteresis: new Array(NUM_SLOTS).fill(false),
      };
      this.debounceFilterState = {
        debounceCounts: new Array(NUM_SLOTS).fill(0),
        candidateOccupied: new Array(NUM_SLOTS).fill(false),
      };
      this.initialized = false;
    }
  }

  record(
    distances: number[],
    threshold = 15,
    debounceTicks = 3,
    hysteresisLow?: number,
    hysteresisHigh?: number,
  ): void {
    if (!this.initialized) {
      this.initFromDistances(distances, threshold);
      return;
    }

    const low = hysteresisLow ?? threshold;
    const high = hysteresisHigh ?? (threshold === 15 ? 18 : threshold + 3);

    for (let i = 0; i < NUM_SLOTS; i++) {
      const rawDist = distances[i] ?? TIMEOUT_DISTANCE_CM;
      const d = normalizeDistance(rawDist);

      // 1. None (raw threshold: < threshold is occupied)
      const occNone = d < threshold;
      if (occNone !== this.prevStates.none[i]) {
        this.counts.none++;
        this.slotCounts.none[i]++;
        this.prevStates.none[i] = occNone;
      }

      // 2. Debounce
      const occRaw = d < threshold;
      let occDebounce = this.prevStates.debounce[i];
      if (occRaw !== this.prevStates.debounce[i]) {
        if (this.debounceFilterState.candidateOccupied[i] === occRaw) {
          this.debounceFilterState.debounceCounts[i]++;
        } else {
          this.debounceFilterState.candidateOccupied[i] = occRaw;
          this.debounceFilterState.debounceCounts[i] = 1;
        }

        if (this.debounceFilterState.debounceCounts[i] >= debounceTicks) {
          this.debounceFilterState.debounceCounts[i] = 0;
          occDebounce = occRaw;
        }
      } else {
        this.debounceFilterState.debounceCounts[i] = 0;
        this.debounceFilterState.candidateOccupied[i] = this.prevStates.debounce[i];
      }

      if (occDebounce !== this.prevStates.debounce[i]) {
        this.counts.debounce++;
        this.slotCounts.debounce[i]++;
        this.prevStates.debounce[i] = occDebounce;
      }

      // 3. Hysteresis (low occupy, high vacate)
      let occHysteresis = this.prevStates.hysteresis[i];
      if (!occHysteresis && d < low) {
        occHysteresis = true;
      } else if (occHysteresis && d >= high) {
        occHysteresis = false;
      }

      if (occHysteresis !== this.prevStates.hysteresis[i]) {
        this.counts.hysteresis++;
        this.slotCounts.hysteresis[i]++;
        this.prevStates.hysteresis[i] = occHysteresis;
      }
    }
  }

  getMetrics(): FlickerMetrics {
    return {
      none: this.counts.none,
      debounce: this.counts.debounce,
      hysteresis: this.counts.hysteresis,
      perSlot: {
        none: [...this.slotCounts.none],
        debounce: [...this.slotCounts.debounce],
        hysteresis: [...this.slotCounts.hysteresis],
      },
    };
  }
}
