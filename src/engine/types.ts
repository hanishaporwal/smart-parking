export const NUM_SLOTS = 8;
export const PIXELS_PER_STRIP = 100;
export const PIXELS_PER_SLOT = 25;
export const SLOTS_PER_STRIP = 4;
export const NUM_STRIPS = 2;
export const BLINK_MS = 300;
export const SWEEP_STEP_MS = 15;
export const TIMEOUT_DISTANCE_CM = 400;
export const DEFAULT_OCCUPANCY_THRESHOLD_CM = 15;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const COLOR_RED: Readonly<RgbColor> = Object.freeze({ r: 255, g: 0, b: 0 });
export const COLOR_GREEN: Readonly<RgbColor> = Object.freeze({ r: 0, g: 255, b: 0 }); // bright: sweep + blinking target
export const COLOR_DIM: Readonly<RgbColor> = Object.freeze({ r: 0, g: 200, b: 0 });   // dim: other vacant slots
export const COLOR_OFF: Readonly<RgbColor> = Object.freeze({ r: 0, g: 0, b: 0 });

export type LedStrip = RgbColor[];
export type LedFrame = [LedStrip, LedStrip]; // 2 strips x 100 RGB pixels

export interface SlotState {
  slotIndex: number;      // 0..7 (S1 is 0, S8 is 7)
  lane: number;           // 0 (upper strip) or 1 (lower strip)
  positionInLane: number; // 0..3 relative position from lane entrance
  distance: number;       // distance in cm (integer)
  occupied: boolean;      // true if distance < threshold
  isTarget: boolean;      // true if designated target slot
}

export type GuidanceMode = 'firmware' | 'perLane';
export type FilteringMode = 'none' | 'debounce' | 'hysteresis';
export type SensorModel = 'ideal' | 'realistic';
export type SensorFault = 'none' | 'stuck' | 'disconnected' | 'noisy';

export interface GpioPins {
  trig: number;
  echo: number;
}

export const SENSOR_PINS: readonly GpioPins[] = Object.freeze([
  { trig: 5, echo: 4 },
  { trig: 18, echo: 17 },
  { trig: 19, echo: 16 },
  { trig: 21, echo: 22 },
  { trig: 13, echo: 12 },
  { trig: 14, echo: 27 },
  { trig: 26, echo: 25 },
  { trig: 33, echo: 32 },
]);

export interface SimConfig {
  threshold: number;
  mode: GuidanceMode;
  filtering: FilteringMode;
  blockingSweep?: boolean;
  hysteresisLow?: number;
  hysteresisHigh?: number;
  debounceTicks?: number;
}

export type SimEventType =
  | 'SENSOR_READING'
  | 'SLOT_OCCUPIED'
  | 'SLOT_VACATED'
  | 'TARGETS_CHANGED'
  | 'REDRAW'
  | 'SWEEP_START'
  | 'SWEEP_END';

export interface SimEvent {
  type: SimEventType;
  timestamp: number;
  slotIndex?: number;
  lane?: number;
  data?: Record<string, unknown>;
  description?: string;
}

export interface DataSource {
  getDistance(slotIndex: number, nowMs?: number): number;
  setDistance(slotIndex: number, distanceCm: number): void;
  getAllDistances(nowMs?: number): number[];
}

export interface SweepState {
  startMs: number;
  endPixel: [number, number]; // target end pixel index (-1 if no target)
  durationMs: number;
}

export interface EngineFilterState {
  debounceCounts: number[];
  candidateOccupied: boolean[];
}

export interface EngineState {
  slots: SlotState[];
  lastOccupied: boolean[];
  needDraw: boolean;
  blinkOn: boolean;
  lastBlinkMs: number;
  lastTickMs: number;
  blockedUntilMs: number;
  sweep: SweepState | null;
  config: SimConfig;
  ledFrame: LedFrame;
  filterState?: EngineFilterState;
}
