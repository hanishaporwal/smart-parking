export type ClaimId = 'claim2' | 'claim5' | 'claim12' | 'claim7';

export interface ClaimStepDef {
  number: number;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ClaimDefinition {
  id: ClaimId;
  claimNumber: number;
  pillar: string;
  title: string;
  duration: number; // exactly 10.0s
  steps: ClaimStepDef[];
}

export type SlotPillState = 'IDLE' | 'VACANT' | 'OCCUPIED' | 'TARGET';

export interface TwinSlotState {
  index: number; // 0..7 (0..3 upper row S1..S4, 4..7 lower row S5..S8)
  lane: 0 | 1;
  col: number; // 0..3
  occupied: boolean;
  isTarget: boolean;
  isDimmed: boolean;
  pillState: SlotPillState;
  sensorState: 'idle' | 'blueActive' | 'red' | 'green';
  isSensorGlow: boolean;
}

export interface UltrasonicWaveArc {
  id: string;
  slotIndex: number;
  direction: 'outgoing' | 'returnFast' | 'returnSlow';
  y: number; // Y position of the wave center
  arcRadius: number;
  opacity: number;
  color: 'cyan' | 'red' | 'green';
}

export interface TwinDataPacket {
  id: string;
  slotIndex: number;
  progress: number; // 0 to 1 along border to ENTRY box
  color: 'red' | 'green';
}
