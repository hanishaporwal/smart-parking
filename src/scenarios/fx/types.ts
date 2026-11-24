import { RgbColor } from '@/engine';

export type Tone = 'green' | 'red' | 'gold' | 'info';

export type SlotOrAll = number | number[] | 'all';

export interface SonarOptions {
  stagger?: number;
  tone?: 'info' | 'red' | 'green';
  duration?: number;
  onPulseReturn?: (slot: number) => void;
}

export interface SonarState {
  slot: number;
  tone: 'info' | 'red' | 'green';
  key: number;
  duration: number;
}

export interface ReadoutState {
  slot: number;
  cm: number;
  tone: 'green' | 'red';
  visible: boolean;
  persisted?: boolean;
}

export interface PillState {
  slot: number;
  state: 'VACANT' | 'OCCUPIED' | 'TARGET';
  isFlipping?: boolean;
}

export interface TargetRingState {
  slots: number[];
  pulsing: boolean;
}

export interface ScanColumnState {
  column: number;
  results: Record<number, 'check' | 'cross'>;
}

export interface ScanState {
  active: boolean;
  currentColumn: number;
  results: Record<number, 'check' | 'cross'>;
}

export type ChipAnchor =
  | 'entry-ground'
  | 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8'
  | { type: 'slot'; slot: number }
  | { type: 'coord'; x: number; y: number }
  | { x: number; y: number };

export interface ChipState {
  id: string;
  anchor: ChipAnchor;
  text: string;
  icon?: string;
  visible: boolean;
  persisted?: boolean;
}

export interface BarrierState {
  armRaised: boolean;
  lightColor: 'red' | 'green' | 'amber';
  entrySignGlow?: boolean;
}

export interface DashboardCardData {
  occupied: number;
  vacant: number;
  target: string;
}

export interface DashboardCardState {
  visible: boolean;
  data: DashboardCardData;
  countProgress: number; // 0..1
}

export interface RouteOverrideState {
  active: boolean;
  lane: number;
  targetSlot: number;
  dottedToPx?: number;
  solidToPx?: number;
  cometProgress?: number; // 0..1
  retracting?: boolean;
  persisted?: boolean;
}

export interface GreenTrailPoint {
  x: number;
  y: number;
  id: number;
  opacity: number;
}

export interface DriverCarState {
  visible: boolean;
  x: number;
  y: number;
  rotation: number;
  brakeLights?: boolean;
  headlights?: boolean;
  headlightFlash?: boolean;
  isReversing?: boolean;
  greenTrail?: GreenTrailPoint[];
}

export interface IntruderCarState {
  visible: boolean;
  x: number;
  y: number;
  rotation: number;
  isReversing?: boolean;
}

export interface PhoneBadgeState {
  visible: boolean;
  persisted?: boolean;
}

export interface PathGhostState {
  visible: boolean;
  lane: number;
  targetSlot: number;
  progress: number;
  opacity: number;
}

export interface LedVisualState {
  deferSweepVisual: boolean;
  customPixels: (RgbColor | null)[][]; // 2 x 100
  sweepProgress: { strip: 0 | 1; toPx: number; currentPx: number } | null;
  blinkingSlot: number | null;
  blinkState: boolean;
}

export interface CarEntityState {
  slot?: number;
  state: 'arriving' | 'parked' | 'leaving' | 'atGate' | 'followingRoute' | 'reversing';
  targetPoint?: { x: number; y: number };
}

export interface PositionRulerState {
  visible: boolean;
  visibleColumns: number[]; // 0, 1, 2, 3
  activeHighlightColumn: number | null; // 0, 1, 2, 3
  persisted?: boolean;
}

export interface MeasureArrowState {
  visible: boolean;
  targetX: number;
  currentColumn: number;
}

export interface RankBadgeState {
  text: string;
  strikeP?: boolean;
  persisted?: boolean;
}
