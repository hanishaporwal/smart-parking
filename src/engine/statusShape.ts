import { EngineState, SlotState } from './types';

export interface FirmwareSlotStatus {
  occupied: boolean;
  distance: number;
}

export interface FirmwareStatusJson {
  slots: FirmwareSlotStatus[];
  targets: number[];
}

/**
 * Transforms engine state into the exact JSON telemetry shape returned by
 * the physical ESP32 HTTP GET /status endpoint.
 */
export function toStatusJson(state: EngineState | { slots: SlotState[] }): FirmwareStatusJson {
  const slots: FirmwareSlotStatus[] = state.slots.map(s => ({
    occupied: s.occupied,
    distance: s.distance,
  }));

  const targets: number[] = [];
  for (let i = 0; i < state.slots.length; i++) {
    if (state.slots[i].isTarget) {
      targets.push(i);
    }
  }

  return { slots, targets };
}

/**
 * Serializes the status JSON string, identically formatted to the ESP32 server output.
 */
export function toStatusJsonString(state: EngineState | { slots: SlotState[] }): string {
  return JSON.stringify(toStatusJson(state));
}
