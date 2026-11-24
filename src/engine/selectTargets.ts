import { NUM_SLOTS, SLOTS_PER_STRIP, SlotState, GuidanceMode, SimEvent } from './types';

export interface TargetSelectionResult {
  updatedSlots: SlotState[];
  targets: number[];
  targetsChanged: boolean;
  event?: SimEvent;
}

/**
 * Resolves active target slot(s) according to the configured mode.
 * - 'firmware': Exact physical firmware logic. Evaluates one global minimum relative position (i % 4)
 *               across all vacant slots in both lanes. Any vacant slot matching this global minimum
 *               becomes a target (causing ties across lanes to both blink).
 * - 'perLane':  Independent targeting per lane. Lane 0 and Lane 1 each independently select their own
 *               nearest vacant slot from their respective entrances.
 */
export function selectTargets(
  slots: SlotState[],
  mode: GuidanceMode,
  previousTargetIndices?: number[],
  timestampMs = 0,
): TargetSelectionResult {
  const isTarget: boolean[] = new Array(NUM_SLOTS).fill(false);

  if (mode === 'firmware') {
    let best = 99;
    for (let i = 0; i < NUM_SLOTS; i++) {
      const pos = i % SLOTS_PER_STRIP;
      if (!slots[i].occupied && pos < best) {
        best = pos;
      }
    }

    if (best !== 99) {
      for (let i = 0; i < NUM_SLOTS; i++) {
        const pos = i % SLOTS_PER_STRIP;
        isTarget[i] = !slots[i].occupied && pos === best;
      }
    }
  } else {
    // mode: 'perLane'
    for (let lane = 0; lane < 2; lane++) {
      let laneBest = 99;
      const startIdx = lane * SLOTS_PER_STRIP;
      const endIdx = startIdx + SLOTS_PER_STRIP;

      for (let i = startIdx; i < endIdx; i++) {
        const pos = i % SLOTS_PER_STRIP;
        if (!slots[i].occupied && pos < laneBest) {
          laneBest = pos;
        }
      }

      if (laneBest !== 99) {
        for (let i = startIdx; i < endIdx; i++) {
          const pos = i % SLOTS_PER_STRIP;
          isTarget[i] = !slots[i].occupied && pos === laneBest;
        }
      }
    }
  }

  const currentTargets: number[] = [];
  const updatedSlots = slots.map((s, idx) => {
    const target = isTarget[idx];
    if (target) {
      currentTargets.push(idx);
    }
    return {
      ...s,
      isTarget: target,
    };
  });

  // Check if targets changed compared to previous targets
  const prev = previousTargetIndices ?? [];
  const targetsChanged =
    prev.length !== currentTargets.length ||
    !prev.every(val => currentTargets.includes(val));

  let event: SimEvent | undefined;
  if (targetsChanged) {
    const names = currentTargets.map(t => `S${t + 1}`).join(', ') || 'None';
    event = {
      type: 'TARGETS_CHANGED',
      timestamp: timestampMs,
      data: {
        targets: currentTargets,
        mode,
      },
      description: `Active guidance targets updated: [${names}] (mode: ${mode})`,
    };
  }

  return {
    updatedSlots,
    targets: currentTargets,
    targetsChanged,
    event,
  };
}
