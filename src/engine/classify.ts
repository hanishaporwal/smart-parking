import {
  NUM_SLOTS,
  SLOTS_PER_STRIP,
  TIMEOUT_DISTANCE_CM,
  SlotState,
  SimConfig,
  SimEvent,
  EngineFilterState,
} from './types';

/**
 * Normalizes a raw distance reading: integer cm between 0 and 400.
 * Duration 0 or timeouts clamp to 400 cm as defined in firmware.
 */
export function normalizeDistance(distanceCm: number): number {
  if (isNaN(distanceCm) || distanceCm <= 0 || distanceCm >= TIMEOUT_DISTANCE_CM) {
    return TIMEOUT_DISTANCE_CM;
  }
  return Math.round(distanceCm);
}

/**
 * Pure function to check occupancy given a distance and config threshold.
 * Exact firmware rule: occupied = distance < 15 cm.
 */
export function isOccupiedSimple(distanceCm: number, threshold: number): boolean {
  return distanceCm < threshold;
}

/**
 * Classifies a single slot considering configured filtering mode.
 */
export function classifySlot(
  slotIndex: number,
  rawDistance: number,
  currentOccupied: boolean,
  config: SimConfig,
  filterState?: EngineFilterState,
): { occupied: boolean; distance: number } {
  const distance = normalizeDistance(rawDistance);

  if (config.filtering === 'none') {
    return {
      occupied: isOccupiedSimple(distance, config.threshold),
      distance,
    };
  }

  if (config.filtering === 'hysteresis') {
    // Default specification: 15 cm occupy, 18 cm vacate (3 cm hysteresis band)
    const low = config.hysteresisLow ?? config.threshold;
    const high = config.hysteresisHigh ?? (config.threshold === 15 ? 18 : config.threshold + 3);

    let occupied = currentOccupied;
    if (!currentOccupied && distance < low) {
      occupied = true;
    } else if (currentOccupied && distance >= high) {
      occupied = false;
    }
    return { occupied, distance };
  }

  if (config.filtering === 'debounce' && filterState) {
    const rawOccupied = isOccupiedSimple(distance, config.threshold);
    const requiredTicks = config.debounceTicks ?? 3;

    if (rawOccupied !== currentOccupied) {
      if (filterState.candidateOccupied[slotIndex] === rawOccupied) {
        filterState.debounceCounts[slotIndex] += 1;
        if (filterState.debounceCounts[slotIndex] >= requiredTicks) {
          filterState.debounceCounts[slotIndex] = 0;
          return { occupied: rawOccupied, distance };
        }
      } else {
        filterState.candidateOccupied[slotIndex] = rawOccupied;
        filterState.debounceCounts[slotIndex] = 1;
      }
      return { occupied: currentOccupied, distance };
    } else {
      filterState.debounceCounts[slotIndex] = 0;
      filterState.candidateOccupied[slotIndex] = currentOccupied;
      return { occupied: currentOccupied, distance };
    }
  }

  return {
    occupied: isOccupiedSimple(distance, config.threshold),
    distance,
  };
}

/**
 * Classifies all 8 slots from an array of distances.
 * Generates SimEvents for sensor readings, occupancies, and vacancies.
 */
export function classifySlots(
  distances: number[],
  config: SimConfig,
  previousSlots?: SlotState[],
  filterState?: EngineFilterState,
  timestampMs = 0,
): { slots: SlotState[]; events: SimEvent[] } {
  const slots: SlotState[] = [];
  const events: SimEvent[] = [];

  for (let i = 0; i < NUM_SLOTS; i++) {
    const lane = Math.floor(i / SLOTS_PER_STRIP);
    const positionInLane = i % SLOTS_PER_STRIP;
    const rawDist = distances[i] ?? TIMEOUT_DISTANCE_CM;
    const prevOccupied = previousSlots ? previousSlots[i].occupied : false;
    const prevDist = previousSlots ? previousSlots[i].distance : -1;

    const { occupied, distance } = classifySlot(
      i,
      rawDist,
      prevOccupied,
      config,
      filterState,
    );

    const slot: SlotState = {
      slotIndex: i,
      lane,
      positionInLane,
      distance,
      occupied,
      isTarget: previousSlots ? previousSlots[i].isTarget : false,
    };
    slots.push(slot);

    // Emit sensor reading event if distance changed or on initial read
    if (distance !== prevDist) {
      events.push({
        type: 'SENSOR_READING',
        timestamp: timestampMs,
        slotIndex: i,
        lane,
        data: { distance, occupied },
        description: `Slot S${i + 1} sensor reading: ${distance} cm (${occupied ? 'Occupied' : 'Vacant'})`,
      });
    }

    // Detect occupancy state transitions
    if (previousSlots) {
      if (!prevOccupied && occupied) {
        events.push({
          type: 'SLOT_OCCUPIED',
          timestamp: timestampMs,
          slotIndex: i,
          lane,
          data: { distance },
          description: `Slot S${i + 1} became OCCUPIED (distance: ${distance} cm)`,
        });
      } else if (prevOccupied && !occupied) {
        events.push({
          type: 'SLOT_VACATED',
          timestamp: timestampMs,
          slotIndex: i,
          lane,
          data: { distance },
          description: `Slot S${i + 1} became VACANT (distance: ${distance} cm)`,
        });
      }
    } else {
      // Initial state
      if (occupied) {
        events.push({
          type: 'SLOT_OCCUPIED',
          timestamp: timestampMs,
          slotIndex: i,
          lane,
          data: { distance },
          description: `Slot S${i + 1} initialized as OCCUPIED (distance: ${distance} cm)`,
        });
      }
    }
  }

  return { slots, events };
}
