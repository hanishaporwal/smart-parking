import React, { useMemo, useState, useEffect } from 'react';
import { SlotCard } from '../SlotCard';
import { LedStripSvg } from '../LedStripSvg';
import { CarSvg } from '../CarSvg';
import {
  LOT_DESIGN_WIDTH,
  LOT_DESIGN_HEIGHT,
  START_X,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  LANE0_LED_Y,
  LANE1_LED_Y,
  ENTRANCE_Y,
  TOTAL_STRIP_WIDTH,
} from '../lotLayout';
import { LedFrame, RgbColor, COLOR_RED, COLOR_DIM, COLOR_OFF, COLOR_GREEN, SlotState } from '@/engine';
import { UltrasonicWaveArc, TwinDataPacket, ClaimId } from './types';

interface TopDownTwinStageProps {
  claimId?: ClaimId;
  time: number; // in seconds (0.0 to 10.0)
  isPlaying: boolean;
}

// Center X of the 4 slot columns:
// S1/S5: 419, S2/S6: 609, S3/S7: 799, S4/S8: 989
const SLOT_CENTERS_X = [
  START_X + 0 * SLOT_WIDTH + SLOT_WIDTH * 0.5,
  START_X + 1 * SLOT_WIDTH + SLOT_WIDTH * 0.5,
  START_X + 2 * SLOT_WIDTH + SLOT_WIDTH * 0.5,
  START_X + 3 * SLOT_WIDTH + SLOT_WIDTH * 0.5,
];

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Universal Per-Slot WS2812 LED Strip Renderer for all claims.
 * Every row is split into 4 independent segments (one per slot).
 * - Occupied slot -> steady RED
 * - Vacant slot -> OFF (dark dotted idle)
 * - Target slot -> blinking GREEN (liveBlinkOn 300ms cycle)
 * - End of scenario -> sequential switch-off left to right until dark
 */
function computePerSlotLedFrame(
  slotStates: {
    slot: SlotState;
    isTargetRing?: boolean;
    pillState?: 'VACANT' | 'OCCUPIED' | 'TARGET' | 'HIDDEN';
  }[],
  time: number,
  duration: number,
  blinkOn: boolean,
  options?: {
    vacantColor?: 'off' | 'green';
    turnOffAtEnd?: boolean;
  }
): LedFrame {
  type SegmentState = 'off' | 'red' | 'blink-green' | 'green';

  const vacantColor = options?.vacantColor ?? 'green';
  const turnOffAtEnd = options?.turnOffAtEnd ?? false;

  // Compute state map each frame directly from slot states
  const ledSegments: SegmentState[] = slotStates.map((s) => {
    const isOcc = s.slot.occupied;
    const isTarget = !isOcc && (s.slot.isTarget || s.isTargetRing || s.pillState === 'TARGET');
    if (isOcc) return 'red';
    if (isTarget) return 'blink-green';
    return vacantColor === 'green' ? 'green' : 'off';
  });

  // At the end of the scenario: all segments switch off in sequence, left to right, until the strip is dark
  if (turnOffAtEnd) {
    const endPhaseStart = duration - 1.0;
    if (time >= endPhaseStart) {
      const elapsed = time - endPhaseStart;
      if (elapsed >= 0.2) {
        ledSegments[0] = 'off'; // S1
        ledSegments[4] = 'off'; // S5
      }
      if (elapsed >= 0.4) {
        ledSegments[1] = 'off'; // S2
        ledSegments[5] = 'off'; // S6
      }
      if (elapsed >= 0.6) {
        ledSegments[2] = 'off'; // S3
        ledSegments[6] = 'off'; // S7
      }
      if (elapsed >= 0.8) {
        ledSegments[3] = 'off'; // S4
        ledSegments[7] = 'off'; // S8
      }
    }
  }

  // Render each segment from its own entry in ledSegments (never across multiple slots)
  const strip0: RgbColor[] = Array.from({ length: 100 }).map(() => ({ ...COLOR_OFF }));
  const strip1: RgbColor[] = Array.from({ length: 100 }).map(() => ({ ...COLOR_OFF }));

  for (let i = 0; i < 8; i++) {
    const lane = i < 4 ? 0 : 1;
    const col = i % 4;
    const targetStrip = lane === 0 ? strip0 : strip1;
    const state = ledSegments[i];
    const color =
      state === 'red'
        ? COLOR_RED
        : state === 'blink-green'
        ? (blinkOn ? COLOR_GREEN : COLOR_OFF)
        : state === 'green'
        ? COLOR_DIM
        : COLOR_OFF;

    const start = col * 25;
    for (let p = 0; p < 25; p++) {
      targetStrip[start + p] = { ...color };
    }
  }

  return [strip0, strip1];
}

export const TopDownTwinStage: React.FC<TopDownTwinStageProps> = ({
  claimId = 'claim7',
  time,
  isPlaying = false,
}) => {
  // Live continuous 300ms blink clock (persists even when master animation stops)
  const [liveBlinkOn, setLiveBlinkOn] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveBlinkOn((b) => !b);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // COMPUTE 10.0S TIMELINE FOR ACTIVE CLAIM
  // ---------------------------------------------------------------------------
  const {
    slotStates,
    ledFrame,
    waves,
    powerPulses,
    contactPings,
    dataPackets,
    entryPulse,
    claim5DottedLines,
    claim5ScanX,
    claim5Flashes,
    barrierAngle,
    movingCarA,
    movingCarB,
    guidanceRoute1,
    guidanceRoute2,
    shimmerX,
  } = useMemo(() => {
    // =========================================================================
    // CLAIM 7: ADAPT — REAL-TIME OBSTRUCTION RE-ROUTING (DUAL CARS)
    // =========================================================================
    if (claimId === 'claim7') {
      // START STATE: S1 (0), S3 (2), S5 (4), S6 (5) hold parked cars.
      // S2 (1), S4 (3), S7 (6), S8 (7) are vacant.
      const initialOccupied = [0, 2, 4, 5];

      // S2 Status:
      // t < 2.5s: target S2 (flashing amber)
      // t in [2.5, 4.5s]: Car B in slot, S2 target flash stops
      // t >= 4.8s: OCCUPIED (solid red)
      const isS2Target = time < 4.5;
      const isS2TargetBlink = isS2Target && liveBlinkOn;
      const isS2Occupied = time >= 4.8;

      // S7 Status (Slot index 6, Lane 1, Col 2):
      // Step 4: (5.5-6.5s) "The next loop picks S7."
      // S7 becomes TARGET (flashing amber, star pill) and its segment starts blinking green
      // Step 6: (8.0-10.0s) "The driver parks in S7."
      // At time >= 8.9s: S7 turns OCCUPIED (solid red)
      const isS7Target = time >= 5.5 && time < 8.9;
      const isS7TargetBlink = isS7Target && liveBlinkOn;
      const isS7Occupied = time >= 8.9;

      const slotStates: {
        slot: SlotState;
        isDimmed: boolean;
        isCandidateGlow: boolean;
        isTargetRing: boolean;
        isSensorGlow: boolean;
        pillState: 'VACANT' | 'OCCUPIED' | 'TARGET';
        sensorTone?: 'red' | 'green' | 'blue';
        hideCarSprite?: boolean;
      }[] = Array.from({ length: 8 }).map((_, i) => {
        if (i === 1) {
          // S2 Bay (Lane 0, Col 1)
          return {
            slot: {
              slotIndex: 1,
              lane: 0,
              positionInLane: 1,
              occupied: isS2Occupied,
              distance: isS2Occupied ? 8 : 28,
              isTarget: isS2Target && isS2TargetBlink,
            },
            isDimmed: false,
            isCandidateGlow: false,
            isTargetRing: isS2Target,
            isSensorGlow: false,
            pillState: isS2Occupied ? 'OCCUPIED' : isS2Target ? 'TARGET' : 'VACANT',
            sensorTone: isS2Occupied ? 'red' : isS2Target ? (isS2TargetBlink ? 'green' : undefined) : 'green',
            // Car B is rendered as animated car in S2
            hideCarSprite: true,
          };
        }

        if (i === 6) {
          // S7 Bay (Lane 1, Col 2)
          return {
            slot: {
              slotIndex: 6,
              lane: 1,
              positionInLane: 2,
              occupied: isS7Occupied,
              distance: isS7Occupied ? 8 : 28,
              isTarget: isS7Target && isS7TargetBlink,
            },
            isDimmed: false,
            isCandidateGlow: false,
            isTargetRing: isS7Target,
            isSensorGlow: false,
            pillState: isS7Occupied ? 'OCCUPIED' : isS7Target ? 'TARGET' : 'VACANT',
            sensorTone: isS7Occupied ? 'red' : isS7Target ? (isS7TargetBlink ? 'green' : undefined) : 'green',
            // Car A is rendered as animated car in S7
            hideCarSprite: true,
          };
        }

        const isOcc = initialOccupied.includes(i);
        return {
          slot: {
            slotIndex: i,
            lane: (i < 4 ? 0 : 1) as 0 | 1,
            positionInLane: (i % 4) as 0 | 1 | 2 | 3,
            occupied: isOcc,
            distance: isOcc ? 8 : 28,
            isTarget: false,
          },
          isDimmed: false,
          isCandidateGlow: false,
          isTargetRing: false,
          isSensorGlow: false,
          pillState: isOcc ? 'OCCUPIED' : 'VACANT',
          sensorTone: isOcc ? 'red' : 'green',
        };
      });

      // Barrier Arm
      let barrierAngle = 0;
      if (time >= 0.0 && time < 0.6) {
        barrierAngle = -85 * easeOut(time / 0.6);
      } else if (time >= 0.6 && time < 9.2) {
        barrierAngle = -85;
      } else if (time >= 9.2 && time < 9.8) {
        barrierAngle = -85 * (1 - easeOut((time - 9.2) / 0.6));
      } else if (time >= 9.8) {
        barrierAngle = 0;
      }

      // -----------------------------------------------------------------------
      // Car B (Intruder Car: Sunset Amber #EA580C)
      // Enters from the starting point on the entrance road over the "PARKING" name,
      // drives through the gate, and cuts into S2 ahead of Car A.
      // -----------------------------------------------------------------------
      let movingCarB: {
        x: number;
        y: number;
        rotation: number;
        headlights: boolean;
        brakeLights: boolean;
      } | null = null;

      if (time < 2.5) {
        // Cruising from entrance road (X = -70, front bumper touching the "PARKING" stencil start)
        // smoothly drives across the yellow "PARKING" road marking, past the lifting gate, and nears S2 (X = 635)
        let carX: number;
        let isBraking = false;
        if (time < 2.0) {
          const p = time / 2.0;
          carX = -70 + (560 - (-70)) * p;
        } else {
          const p = (time - 2.0) / 0.5;
          carX = 560 + (635 - 560) * easeOut(p);
          isBraking = true;
        }
        movingCarB = {
          x: carX,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: isBraking,
        };
      } else if (time < 4.3) {
        // Swings into S2 bay (rotating 0 -> -90 deg, settling at X=609, Y=116)
        if (time < 3.7) {
          const p = (time - 2.5) / 1.2;
          const pEase = easeOut(p);
          const carX = 635 - (635 - 609) * pEase;
          const carY = ENTRANCE_Y - (ENTRANCE_Y - 125) * pEase;
          const rot = -90 * pEase;
          movingCarB = {
            x: carX,
            y: carY,
            rotation: rot,
            headlights: true,
            brakeLights: true,
          };
        } else if (time < 4.0) {
          const p = (time - 3.7) / 0.3;
          const carY = 125 - (125 - 112) * p;
          movingCarB = {
            x: 609,
            y: carY,
            rotation: -90,
            headlights: true,
            brakeLights: false,
          };
        } else {
          const p = (time - 4.0) / 0.3;
          const carY = 112 + (116 - 112) * p;
          const brakeFlash = time >= 4.0 && time <= 4.2;
          movingCarB = {
            x: 609,
            y: carY,
            rotation: -90,
            headlights: time < 4.2,
            brakeLights: brakeFlash,
          };
        }
      } else {
        // Settled stationary in S2
        movingCarB = {
          x: 609,
          y: 116,
          rotation: -90,
          headlights: false,
          brakeLights: false,
        };
      }

      // -----------------------------------------------------------------------
      // Car A (Guided Car: Electric Royal Blue #2563EB)
      // Enters behind Car B from the "PARKING" entrance, follows green route,
      // stops when Car B cuts into S2, gets redirected to S7, and parks in S7.
      // -----------------------------------------------------------------------
      let movingCarA: {
        x: number;
        y: number;
        rotation: number;
        headlights: boolean;
        brakeLights: boolean;
        color?: string;
      } | null = null;

      if (time < 2.5) {
        // Enters from the "PARKING" entrance road ONE BY ONE after Car B has cleared the gate
        if (time < 1.0) {
          // Waiting outside the entrance until Car B has passed through the gate
          movingCarA = null;
        } else {
          // Drives smoothly across "PARKING" stencil, through the gate, and into the aisle behind Car B
          const p = (time - 1.0) / 1.5;
          const carX = -70 + (350 - (-70)) * p;
          movingCarA = {
            x: carX,
            y: ENTRANCE_Y,
            rotation: 0,
            headlights: true,
            brakeLights: false,
          };
        }
      } else if (time < 4.5) {
        // Brakes behind Car B: decelerates from 350 to 480 and stops
        if (time < 3.3) {
          const p = (time - 2.5) / 0.8;
          const carX = 350 + (480 - 350) * easeOut(p);
          movingCarA = {
            x: carX,
            y: ENTRANCE_Y,
            rotation: 0,
            headlights: true,
            brakeLights: true,
          };
        } else {
          movingCarA = {
            x: 480,
            y: ENTRANCE_Y,
            rotation: 0,
            headlights: true,
            brakeLights: true,
          };
        }
      } else if (time < 6.5) {
        // Waiting at X = 480 while S2 is detected occupied and S7 chosen
        movingCarA = {
          x: 480,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: true,
        };
      } else if (time < 8.0) {
        // Accelerates past S2 toward S7: X = 480 to 830 (passing S7 opening at 799 slightly)
        const p = (time - 6.5) / 1.5;
        const carX = 480 + (830 - 480) * easeInOut(p);
        const isBraking = time >= 7.6;
        movingCarA = {
          x: carX,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: isBraking,
        };
      } else if (time < 9.6) {
        // Parking maneuver into S7 (curving DOWN into bottom-row bay, nose to sensor)
        if (time < 8.9) {
          const p = (time - 8.0) / 0.9;
          const pEase = easeOut(p);
          const carX = 830 - (830 - 799) * pEase;
          const carY = ENTRANCE_Y + (465 - ENTRANCE_Y) * pEase;
          const rot = 90 * pEase;
          movingCarA = {
            x: carX,
            y: carY,
            rotation: rot,
            headlights: true,
            brakeLights: true,
          };
        } else if (time < 9.3) {
          const p = (time - 8.9) / 0.4;
          const carY = 465 + (478 - 465) * p;
          movingCarA = {
            x: 799,
            y: carY,
            rotation: 90,
            headlights: true,
            brakeLights: false,
          };
        } else {
          const p = (time - 9.3) / 0.3;
          const carY = 478 - (478 - 474) * p;
          const brakeFlash = time >= 9.3 && time <= 9.5;
          movingCarA = {
            x: 799,
            y: carY,
            rotation: 90,
            headlights: time < 9.5,
            brakeLights: brakeFlash,
          };
        }
      } else {
        // Settled stationary centered in S7, nose to sensor (rotation 90, Y = 474)
        movingCarA = {
          x: 799,
          y: 474,
          rotation: 90,
          headlights: false,
          brakeLights: false,
        };
      }

      // Guidance Route 1: Gate to S2 (active 0.0 to 4.5s)
      let guidanceRoute1: { drawProgress: number; opacity: number } | null = null;
      if (time < 4.5) {
        const pDraw = time < 1.0 ? easeOut(time / 1.0) : 1.0;
        const opacity = time < 3.5 ? 1.0 : clamp(1 - (time - 3.5) / 0.8, 0, 1);
        guidanceRoute1 = { drawProgress: pDraw, opacity };
      }

      // Guidance Route 2: Car A (480) to S7 (active 6.5 to 9.2s)
      let guidanceRoute2: { drawProgress: number; opacity: number } | null = null;
      if (time >= 6.5 && time < 9.2) {
        const pDraw = time < 7.2 ? easeOut((time - 6.5) / 0.7) : 1.0;
        const opacity = time < 8.6 ? 1.0 : clamp(1 - (time - 8.6) / 0.6, 0, 1);
        guidanceRoute2 = { drawProgress: pDraw, opacity };
      }

      // S2 Ultrasonic Echo & Red Data Packet (Step 3: 4.5 - 5.5s)
      const waves: UltrasonicWaveArc[] = [];
      const contactPings: { x: number; y: number; radius: number; opacity: number; color: string }[] = [];
      const dataPackets: TwinDataPacket[] = [];

      if (time >= 4.5 && time < 5.2) {
        const p = (time - 4.5) / 0.7;
        if (p < 0.4) {
          // Outgoing pulse
          waves.push({
            id: 'pulse-s2',
            slotIndex: 1,
            direction: 'outgoing',
            y: 24 + 11 * (p / 0.4),
            arcRadius: 18 + 8 * (p / 0.4),
            opacity: 0.9,
            color: 'cyan',
          });
        } else {
          // Return bounce off Car B bumper
          waves.push({
            id: 'return-s2',
            slotIndex: 1,
            direction: 'returnFast',
            y: 35 - 11 * ((p - 0.4) / 0.6),
            arcRadius: 26 - 8 * ((p - 0.4) / 0.6),
            opacity: 0.85,
            color: 'cyan',
          });
          contactPings.push({
            x: 609,
            y: 35,
            radius: 4 + ((p - 0.4) / 0.6) * 12,
            opacity: clamp(1 - (p - 0.4) / 0.6, 0, 0.85),
            color: '#EF6B6B',
          });
        }
      }

      if (time >= 4.9 && time < 5.5) {
        const pktP = clamp((time - 4.9) / 0.6, 0, 1);
        dataPackets.push({
          id: 'pkt-s2-taken',
          slotIndex: 1,
          progress: pktP,
          color: 'red',
        });
      }

      // Re-scan shimmer in Step 4 (5.5 - 6.2s)
      let shimmerX: number | null = null;
      if (time >= 5.5 && time <= 6.2) {
        const p = (time - 5.5) / 0.7;
        shimmerX = 210 + (1050 - 210) * p;
      }

      // WS2812 LED Frame for Claim 7 (Universal per-slot segments: Occupied = Red, Target = Blinking Green, Vacant = Steady Green)
      const ledFrame = computePerSlotLedFrame(slotStates, time, 10.0, liveBlinkOn, {
        vacantColor: 'green',
        turnOffAtEnd: false,
      });

      return {
        slotStates,
        ledFrame,
        waves,
        powerPulses: [],
        contactPings,
        dataPackets,
        entryPulse: false,
        claim5DottedLines: [],
        claim5ScanX: null,
        claim5Flashes: [],
        barrierAngle,
        movingCarA,
        movingCarB,
        guidanceRoute1,
        guidanceRoute2,
        shimmerX,
      };
    }

    // =========================================================================
    // CLAIM 12: GUIDE — SEQUENTIAL LED VISUAL GUIDANCE & REALISTIC CAR PARKING
    // =========================================================================
    if (claimId === 'claim12') {
      const initialOccupied = [0, 1, 4, 5, 6];
      const isS3Target = time >= 1.8 && time < 8.2;
      const isS3Occupied = time >= 8.2;
      const isTargetBlinkOn = isS3Target && liveBlinkOn;

      const slotStates: {
        slot: SlotState;
        isDimmed: boolean;
        isCandidateGlow: boolean;
        isTargetRing: boolean;
        isSensorGlow: boolean;
        pillState: 'VACANT' | 'OCCUPIED' | 'TARGET';
        sensorTone?: 'red' | 'green' | 'blue';
        hideCarSprite?: boolean;
      }[] = Array.from({ length: 8 }).map((_, i) => {
        if (i === 2) {
          return {
            slot: {
              slotIndex: 2,
              lane: 0,
              positionInLane: 2,
              occupied: isS3Occupied,
              distance: isS3Occupied ? 8 : 28,
              isTarget: isS3Target && isTargetBlinkOn,
            },
            isDimmed: false,
            isCandidateGlow: false,
            isTargetRing: isS3Target,
            isSensorGlow: false,
            pillState: isS3Occupied ? 'OCCUPIED' : isS3Target ? 'TARGET' : 'VACANT',
            sensorTone: isS3Occupied ? 'red' : isS3Target ? (isTargetBlinkOn ? 'green' : undefined) : 'green',
            hideCarSprite: true,
          };
        }

        const isOcc = initialOccupied.includes(i);
        return {
          slot: {
            slotIndex: i,
            lane: (i < 4 ? 0 : 1) as 0 | 1,
            positionInLane: (i % 4) as 0 | 1 | 2 | 3,
            occupied: isOcc,
            distance: isOcc ? 8 : 28,
            isTarget: false,
          },
          isDimmed: false,
          isCandidateGlow: false,
          isTargetRing: false,
          isSensorGlow: false,
          pillState: isOcc ? 'OCCUPIED' : 'VACANT',
          sensorTone: isOcc ? 'red' : 'green',
        };
      });

      let barrierAngle = 0;
      if (time >= 1.1 && time < 1.7) {
        barrierAngle = -85 * easeOut((time - 1.1) / 0.6);
      } else if (time >= 1.7 && time < 9.2) {
        barrierAngle = -85;
      } else if (time >= 9.2 && time < 9.8) {
        barrierAngle = -85 * (1 - easeOut((time - 9.2) / 0.6));
      } else if (time >= 9.8) {
        barrierAngle = 0;
      }

      let guidanceRoute1: { drawProgress: number; opacity: number } | null = null;
      if (time >= 1.8 && time < 9.4) {
        const pDraw = time < 2.6 ? easeOut((time - 1.8) / 0.8) : 1.0;
        let opacity = 1.0;
        if (time < 2.4) {
          // Smooth fade in as path is planned in Step 2 (1.8s - 2.8s)
          opacity = clamp((time - 1.8) / 0.6, 0, 1);
        } else if (time < 8.8) {
          // Fully bright (1.0) throughout Steps 2, 3, 4 ("The driver follows the lights"), and 5 ("The car parks")
          opacity = 1.0;
        } else {
          // Smooth fade out in Step 6 ("The lights switch off", 8.8s - 10.0s)
          opacity = clamp(1 - (time - 8.8) / 0.6, 0, 1);
        }
        guidanceRoute1 = { drawProgress: pDraw, opacity };
      }

      let movingCarA: {
        x: number;
        y: number;
        rotation: number;
        headlights: boolean;
        brakeLights: boolean;
        color?: string;
      } | null = null;

      if (time < 1.8) {
        const p = clamp(time / 1.2, 0, 1);
        const carX = -90 + (165 - (-90)) * easeOut(p);
        const isBraking = time >= 0.8;
        movingCarA = {
          x: carX,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: isBraking,
          color: '#EAB308',
        };
      } else if (time < 4.2) {
        movingCarA = {
          x: 165,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: true,
          color: '#EAB308',
        };
      } else if (time < 7.0) {
        const p = clamp((time - 4.2) / 2.8, 0, 1);
        const carX = 165 + (830 - 165) * easeInOut(p);
        const isBraking = time >= 6.3;
        movingCarA = {
          x: carX,
          y: ENTRANCE_Y,
          rotation: 0,
          headlights: true,
          brakeLights: isBraking,
          color: '#EAB308',
        };
      } else if (time < 9.0) {
        if (time < 8.2) {
          const p = (time - 7.0) / 1.2;
          const pEase = easeOut(p);
          const carX = 830 - (830 - 799) * pEase;
          const carY = ENTRANCE_Y - (ENTRANCE_Y - 130) * pEase;
          const rot = -90 * pEase;
          movingCarA = {
            x: carX,
            y: carY,
            rotation: rot,
            headlights: true,
            brakeLights: true,
            color: '#EAB308',
          };
        } else if (time < 8.6) {
          const p = (time - 8.2) / 0.4;
          const carY = 130 - (130 - 112) * p;
          movingCarA = {
            x: 799,
            y: carY,
            rotation: -90,
            headlights: true,
            brakeLights: false,
            color: '#EAB308',
          };
        } else {
          const p = (time - 8.6) / 0.4;
          const carY = 112 + (116 - 112) * p;
          const brakeFlash = time >= 8.7 && time <= 8.9;
          const headlights = time < 8.85;
          movingCarA = {
            x: 799,
            y: carY,
            rotation: -90,
            headlights,
            brakeLights: brakeFlash,
            color: '#EAB308',
          };
        }
      } else {
        movingCarA = {
          x: 799,
          y: 116,
          rotation: -90,
          headlights: false,
          brakeLights: false,
          color: '#EAB308',
        };
      }

      // WS2812 LED Frame for Claim 12 (Universal per-slot segments: Occupied = Red, Target = Blinking Green, Vacant = Steady Green)
      const ledFrame = computePerSlotLedFrame(slotStates, time, 10.0, liveBlinkOn, {
        vacantColor: 'green',
        turnOffAtEnd: false,
      });

      return {
        slotStates,
        ledFrame,
        waves: [],
        powerPulses: [],
        contactPings: [],
        dataPackets: [],
        entryPulse: false,
        claim5DottedLines: [],
        claim5ScanX: null,
        claim5Flashes: [],
        barrierAngle,
        movingCarA,
        movingCarB: null,
        guidanceRoute1,
        guidanceRoute2: null,
        shimmerX: null,
      };
    }

    // =========================================================================
    // CLAIM 5: DECIDE
    // =========================================================================
    if (claimId === 'claim5') {
      // START STATE:
      // Occupied: S1 (0), S2 (1), S4 (3), S5 (4), S7 (6)
      // Vacant: S3 (2), S6 (5), S8 (7)
      const occupiedIndices = [0, 1, 3, 4, 6];
      const freeSlotIndices = [5, 2, 7]; // S6 (pos 2), S3 (pos 3), S8 (pos 4)

      // Step 1: S6, S3, S8 light up one by one in that order
      const freeActivationTimes: Record<number, number> = {
        5: 0.3, // S6 lights up first
        2: 0.8, // S3 lights up second
        7: 1.3, // S8 lights up third
      };

      const isTargetBlinkOn =
        time >= 8.5 && (isPlaying ? Math.floor((time - 8.5) / 0.3) % 2 === 0 : liveBlinkOn);

      const slotStates: {
        slot: SlotState;
        isDimmed: boolean;
        isCandidateGlow: boolean;
        isTargetRing: boolean;
        isSensorGlow: boolean;
        pillState: 'VACANT' | 'OCCUPIED' | 'TARGET';
        sensorTone?: 'red' | 'green' | 'blue';
        hideCarSprite?: boolean;
      }[] = Array.from({ length: 8 }).map((_, i) => {
        const isOcc = occupiedIndices.includes(i);
        const isFree = freeSlotIndices.includes(i);
        const isDimmed = isOcc && time < 8.5;

        const actTime = freeActivationTimes[i];
        let isCandidateGlow = false;
        if (isFree && actTime !== undefined && time >= actTime) {
          if (time < 7.0) {
            isCandidateGlow = true;
          } else if (time < 8.5) {
            // Step 4: lowest position wins (S6 stays candidate, S3 & S8 return to normal vacant)
            isCandidateGlow = i === 5;
          } else {
            isCandidateGlow = false;
          }
        }

        // Step 5: S6 becomes TARGET
        const isTarget = i === 5 && time >= 8.5;
        const pillState: 'VACANT' | 'OCCUPIED' | 'TARGET' = isTarget
          ? 'TARGET'
          : isOcc
          ? 'OCCUPIED'
          : 'VACANT';

        return {
          slot: {
            slotIndex: i,
            lane: (i < 4 ? 0 : 1) as 0 | 1,
            positionInLane: (i % 4) as 0 | 1 | 2 | 3,
            occupied: isOcc,
            distance: isOcc ? 8 : 28,
            isTarget: isTarget && isTargetBlinkOn,
          },
          isDimmed,
          isCandidateGlow,
          isTargetRing: isTarget,
          isSensorGlow: false,
          pillState,
          sensorTone: isOcc ? 'red' : isTarget ? (isTargetBlinkOn ? 'green' : undefined) : 'green',
        };
      });

      const ledFrame = computePerSlotLedFrame(
        slotStates,
        time,
        10.0,
        isPlaying ? Math.floor((time - 8.5) / 0.3) % 2 === 0 : liveBlinkOn,
        {
          vacantColor: time >= 8.5 ? 'green' : 'off',
          turnOffAtEnd: false, // Continue showing blinking target, red occupied, and green vacant after animation ends
        }
      );

      const claim5DottedLines: {
        slotIndex: number;
        path: string;
        totalLength: number;
        drawProgress: number;
        opacity: number;
        isWinner: boolean;
      }[] = [];

      if (time >= 2.0) {
        const pDraw = time < 4.0 ? easeOut((time - 2.0) / 2.0) : 1.0;

        freeSlotIndices.forEach((slotIdx) => {
          const isUpper = slotIdx < 4;
          const col = slotIdx % 4;
          const cx = SLOT_CENTERS_X[col];
          const aisleY = isUpper ? 280 : 310;
          const openY = isUpper ? 232 : 358;
          const cornerY = isUpper ? 268 : 322;

          const pathD = `M 210 ${aisleY} L ${cx - 14} ${aisleY} Q ${cx} ${aisleY} ${cx} ${cornerY} L ${cx} ${openY}`;
          const approxLen = (cx - 210) + Math.abs(openY - aisleY);

          let opacity = 1.0;
          const isWinner = slotIdx === 5; // S6 is the lowest position winner

          if (time >= 7.0 && time < 8.5) {
            const pFade = (time - 7.0) / 1.5;
            opacity = isWinner ? 1.0 : clamp(1.0 - pFade * 1.2, 0, 1);
          } else if (time >= 8.5) {
            opacity = 0;
          }

          if (opacity > 0.01) {
            claim5DottedLines.push({
              slotIndex: slotIdx,
              path: pathD,
              totalLength: approxLen,
              drawProgress: pDraw,
              opacity,
              isWinner,
            });
          }
        });
      }

      let claim5ScanX: number | null = null;
      const claim5Flashes: { cx: number; cy: number; opacity: number }[] = [];

      if (time >= 4.0 && time <= 7.0) {
        const pScan = (time - 4.0) / 3.0;
        claim5ScanX = 210 + (1050 - 210) * pScan;

        // Flashes in order S6, then S3, then S8 as the vertical scan line sweeps across
        // 1. S6 (cx = 609, cy = 474, reach time ~5.42s)
        if (time >= 5.22 && time <= 5.62) {
          const fP = (time - 5.22) / 0.4;
          const flashOp = clamp(Math.sin(fP * Math.PI) * 0.7, 0, 0.7);
          claim5Flashes.push({ cx: SLOT_CENTERS_X[1], cy: 474, opacity: flashOp });
        }
        // 2. S3 (cx = 799, cy = 116, reach time ~6.10s)
        if (time >= 5.90 && time <= 6.30) {
          const fP = (time - 5.90) / 0.4;
          const flashOp = clamp(Math.sin(fP * Math.PI) * 0.7, 0, 0.7);
          claim5Flashes.push({ cx: SLOT_CENTERS_X[2], cy: 116, opacity: flashOp });
        }
        // 3. S8 (cx = 989, cy = 474, reach time ~6.78s)
        if (time >= 6.58 && time <= 6.98) {
          const fP = (time - 6.58) / 0.4;
          const flashOp = clamp(Math.sin(fP * Math.PI) * 0.7, 0, 0.7);
          claim5Flashes.push({ cx: SLOT_CENTERS_X[3], cy: 474, opacity: flashOp });
        }
      }

      return {
        slotStates,
        ledFrame,
        waves: [],
        powerPulses: [],
        contactPings: [],
        dataPackets: [],
        entryPulse: false,
        claim5DottedLines,
        claim5ScanX,
        claim5Flashes,
        barrierAngle: 0,
        movingCarA: null,
        movingCarB: null,
        guidanceRoute1: null,
        guidanceRoute2: null,
        shimmerX: null,
      };
    }

    // =========================================================================
    // CLAIM 2: SENSE
    // =========================================================================
    const occupiedIndices = [1, 2, 4, 7];

    const slotStates: {
      slot: SlotState;
      isDimmed: boolean;
      isCandidateGlow: boolean;
      isTargetRing: boolean;
      isSensorGlow: boolean;
      pillState: 'VACANT' | 'OCCUPIED' | 'TARGET' | 'HIDDEN';
      sensorTone?: 'red' | 'green' | 'blue';
      hideCarSprite?: boolean;
    }[] = Array.from({ length: 8 }).map((_, i) => {
      const isOcc = occupiedIndices.includes(i);
      return {
        slot: {
          slotIndex: i,
          lane: (i < 4 ? 0 : 1) as 0 | 1,
          positionInLane: (i % 4) as 0 | 1 | 2 | 3,
          occupied: isOcc,
          distance: isOcc ? 8 : 28,
          isTarget: false,
        },
        isDimmed: false,
        isCandidateGlow: false,
        isTargetRing: false,
        isSensorGlow: false,
        pillState: (time >= 5.0 && isOcc)
          ? 'OCCUPIED'
          : (time >= 6.5 && !isOcc)
          ? 'VACANT'
          : 'HIDDEN',
        sensorTone: undefined,
      };
    });

    // WS2812 LED Frame for Claim 2:
    // Steps 1-3 (time < 5.0s): Parked cars are present, but LED strips are off (sensors are measuring).
    // Step 4 (time >= 5.0s): Fast echo (< 15 cm) -> Occupied bays light up RED.
    // Step 5 (time >= 6.5s): Late/missing echo -> Vacant bays light up GREEN.
    // Keep all LED strips lit continuously after step and animation ends.
    let ledFrame: LedFrame;
    if (time < 5.0) {
      const strip0: RgbColor[] = Array.from({ length: 100 }).map(() => ({ ...COLOR_OFF }));
      const strip1: RgbColor[] = Array.from({ length: 100 }).map(() => ({ ...COLOR_OFF }));
      ledFrame = [strip0, strip1];
    } else {
      ledFrame = computePerSlotLedFrame(
        slotStates,
        time,
        10.0,
        liveBlinkOn,
        {
          vacantColor: time >= 6.5 ? 'green' : 'off',
          turnOffAtEnd: false,
        }
      );
    }

    const powerPulses: { slotIndex: number; radius: number; opacity: number }[] = [];
    const waves: UltrasonicWaveArc[] = [];
    const contactPings: { x: number; y: number; radius: number; opacity: number; color: string }[] = [];
    const dataPackets: TwinDataPacket[] = [];
    let entryPulse = false;

    for (let i = 0; i < 8; i++) {
      const switchTime = i * 0.15;
      if (time >= switchTime) {
        slotStates[i].isSensorGlow = true;
        slotStates[i].sensorTone = 'blue';

        const pulseElapsed = time - switchTime;
        if (pulseElapsed >= 0 && pulseElapsed < 0.45) {
          const p = pulseElapsed / 0.45;
          powerPulses.push({
            slotIndex: i,
            radius: 8 + p * 20,
            opacity: clamp(1 - p, 0, 0.95),
          });
        }
      }
    }

    if (time >= 1.5 && time < 3.0) {
      const p = easeOut((time - 1.5) / 1.5);
      for (let i = 0; i < 8; i++) {
        const isUpper = i < 4;
        const curY = isUpper ? 24 + 110 * p : 566 - 110 * p;
        const arcR = 18 + p * 42;
        const opacity = clamp(0.95 - p * 0.45, 0.35, 0.95);

        waves.push({
          id: `pulse-${i}`,
          slotIndex: i,
          direction: 'outgoing',
          y: curY,
          arcRadius: arcR,
          opacity,
          color: 'cyan',
        });
      }
    }

    if (time >= 3.0 && time < 5.0) {
      const step3Elapsed = time - 3.0;

      for (let i = 0; i < 8; i++) {
        const isUpper = i < 4;
        const isOcc = occupiedIndices.includes(i);
        const col = i % 4;
        const cx = SLOT_CENTERS_X[col];

        if (isOcc) {
          if (step3Elapsed < 0.25) {
            const pingP = step3Elapsed / 0.25;
            contactPings.push({
              x: cx,
              y: isUpper ? 35 : 555,
              radius: 4 + pingP * 14,
              opacity: clamp(1 - pingP, 0, 0.9),
              color: '#EF6B6B',
            });
          }

          if (step3Elapsed < 0.75) {
            const retP = clamp(step3Elapsed / 0.75, 0, 1);
            const curY = isUpper ? 35 - retP * 11 : 555 + retP * 11;
            const arcR = 26 - retP * 10;
            const opacity = clamp(0.95 - retP * 0.5, 0.3, 0.95);

            waves.push({
              id: `return-fast-${i}`,
              slotIndex: i,
              direction: 'returnFast',
              y: curY,
              arcRadius: arcR,
              opacity,
              color: 'cyan',
            });
          } else if (step3Elapsed >= 0.75 && step3Elapsed < 1.1) {
            const recP = (step3Elapsed - 0.75) / 0.35;
            contactPings.push({
              x: cx,
              y: isUpper ? 20 : 570,
              radius: 6 + recP * 12,
              opacity: clamp(1 - recP, 0, 0.85),
              color: '#6FB8D6',
            });
          }
        } else {
          if (step3Elapsed < 0.85) {
            const fwdP = clamp(step3Elapsed / 0.85, 0, 1);
            const curY = isUpper ? 134 + fwdP * 96 : 456 - fwdP * 96;
            const arcR = 60 + fwdP * 16;
            const opacity = clamp(0.55 - fwdP * 0.25, 0.15, 0.55);

            waves.push({
              id: `outgoing-deep-${i}`,
              slotIndex: i,
              direction: 'outgoing',
              y: curY,
              arcRadius: arcR,
              opacity,
              color: 'cyan',
            });
          } else {
            const retP = clamp((step3Elapsed - 0.85) / 1.1, 0, 1);
            const curY = isUpper ? 230 - retP * 190 : 360 + retP * 190;
            const arcR = 68 - retP * 36;
            const opacity = clamp(0.32 - retP * 0.22, 0.08, 0.32);

            waves.push({
              id: `return-slow-${i}`,
              slotIndex: i,
              direction: 'returnSlow',
              y: curY,
              arcRadius: arcR,
              opacity,
              color: 'green',
            });
          }
        }
      }
    }

    if (time >= 5.0) {
      occupiedIndices.forEach((idx) => {
        slotStates[idx].isSensorGlow = false;
        slotStates[idx].sensorTone = 'red';
        slotStates[idx].pillState = 'OCCUPIED';
      });
    }

    if (time >= 6.5) {
      [0, 3, 5, 6].forEach((idx) => {
        slotStates[idx].isSensorGlow = false;
        slotStates[idx].sensorTone = 'green';
        slotStates[idx].pillState = 'VACANT';
      });
    }

    if (time >= 8.0) {
      const packetP = clamp((time - 8.0) / 1.4, 0, 1);
      for (let i = 0; i < 8; i++) {
        dataPackets.push({
          id: `pkt-${i}`,
          slotIndex: i,
          progress: packetP,
          color: occupiedIndices.includes(i) ? 'red' : 'green',
        });
      }

      if (time >= 9.25 && time <= 9.85) {
        entryPulse = true;
      }
    }

    return {
      slotStates,
      ledFrame,
      waves,
      powerPulses,
      contactPings,
      dataPackets,
      entryPulse,
      claim5DottedLines: [],
      claim5ScanX: null,
      claim5Flashes: [],
      barrierAngle: 0,
      movingCarA: null,
      movingCarB: null,
      guidanceRoute1: null,
      guidanceRoute2: null,
      shimmerX: null,
    };
  }, [claimId, time, isPlaying, liveBlinkOn]);

  return (
    <div className="relative w-full aspect-[1100/590] rounded-[24px] overflow-hidden bg-[#100E0C] border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.65)] select-none">
      <svg
        viewBox="0 0 1100 590"
        className="w-full h-full object-contain"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="twin-barrier-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#F4EDE4" />
            <rect x="8" width="8" height="16" fill="#EF6B6B" />
          </pattern>

          <filter id="twin-paint-texture" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" result="paintNoise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0.15" result="paintRoughness" />
            <feComposite in="SourceGraphic" in2="paintRoughness" operator="in" />
          </filter>

          <filter id="twin-cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="twin-gold-glow" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="twin-green-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="twin-headlight-cone" x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.75" />
            <stop offset="35%" stopColor="#FEF08A" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. BASE ASPHALT GROUND & ROAD MARKINGS */}
        <image
          id="twin-asphalt-ground"
          href="/realistic-asphalt-layout.webp"
          x={0}
          y={0}
          width={LOT_DESIGN_WIDTH}
          height={LOT_DESIGN_HEIGHT}
          preserveAspectRatio="none"
        />

        {/* Road Kerbs & Boundary Lines */}
        <g id="twin-bay-lines" filter="url(#twin-paint-texture)" opacity={0.95}>
          <line x1={0} y1={LANE0_LED_Y} x2={START_X + TOTAL_STRIP_WIDTH} y2={LANE0_LED_Y} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />
          <line x1={0} y1={LANE1_LED_Y} x2={START_X + TOTAL_STRIP_WIDTH} y2={LANE1_LED_Y} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />
          <line x1={START_X} y1={1} x2={START_X + TOTAL_STRIP_WIDTH} y2={1} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />
          <line x1={START_X} y1={LOT_DESIGN_HEIGHT - 1} x2={START_X + TOTAL_STRIP_WIDTH} y2={LOT_DESIGN_HEIGHT - 1} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />

          {/* Bay Dividers */}
          {[0, 1, 2, 3, 4].map((i) => {
            const lineX = START_X + i * SLOT_WIDTH;
            return (
              <React.Fragment key={`div-${i}`}>
                <line x1={lineX} y1={1} x2={lineX} y2={LANE0_LED_Y} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />
                <line x1={lineX} y1={LANE1_LED_Y} x2={lineX} y2={LOT_DESIGN_HEIGHT - 1} stroke="#ECE7DF" strokeWidth={3.5} strokeLinecap="square" />
              </React.Fragment>
            );
          })}
        </g>

        {/* PARKING Road Chevron Stencil */}
        <g id="twin-parking-marking" filter="url(#twin-paint-texture)" opacity={0.93}>
          <path d="M 6 264 L 18 264 L 34 295 L 18 326 L 6 326 L 22 295 Z" fill="#F3B728" stroke="#F3B728" strokeWidth={0.5} strokeLinejoin="round" />
          <path d="M 23 264 L 35 264 L 51 295 L 35 326 L 23 326 L 39 295 Z" fill="#F3B728" stroke="#F3B728" strokeWidth={0.5} strokeLinejoin="round" />
          <path d="M 40 264 L 154 264 L 170 295 L 154 326 L 40 326 L 56 295 Z" fill="#F3B728" stroke="#F3B728" strokeWidth={0.5} strokeLinejoin="round" />
          <text
            x={105}
            y={295}
            dominantBaseline="central"
            textAnchor="middle"
            fill="#000000"
            fontSize={28}
            fontWeight={900}
            fontFamily="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
            letterSpacing={0.3}
          >
            PARKING
          </text>
          <path d="M 159 264 L 171 264 L 187 295 L 171 326 L 159 326 L 175 295 Z" fill="#F3B728" stroke="#F3B728" strokeWidth={1} strokeLinejoin="round" />
          <path d="M 176 264 L 188 264 L 204 295 L 188 326 L 176 326 L 192 295 Z" fill="#F3B728" stroke="#F3B728" strokeWidth={1} strokeLinejoin="round" />
        </g>

        {/* Center Road In-Ground LED Channel */}
        <g id="twin-center-led-strip">
          <rect x={226} y={ENTRANCE_Y - 4} width={LOT_DESIGN_WIDTH - 226 - 16} height={8} rx={4} fill="#121417" stroke="#35383f" strokeWidth={0.8} />
          <rect x={228} y={ENTRANCE_Y - 2} width={LOT_DESIGN_WIDTH - 228 - 18} height={4} rx={2} fill="#08090b" />
          {Array.from({ length: 48 }).map((_, i) => {
            const x = 240 + i * 17.5;
            if (x > LOT_DESIGN_WIDTH - 28) return null;
            return (
              <g key={`cl-${i}`}>
                <circle cx={x} cy={ENTRANCE_Y} r={1.8} fill="#1a1c20" stroke="#454952" strokeWidth={0.5} />
                <circle cx={x} cy={ENTRANCE_Y} r={0.75} fill="#626875" opacity={0.7} />
              </g>
            );
          })}
        </g>

        {/* ENTRY Controller Guard Booth & Barrier Arm */}
        <g id="twin-entry-gate">
          <rect
            x={144}
            y={176}
            width={56}
            height={48}
            rx={6}
            fill="#1d1f22"
            stroke={entryPulse ? '#5FD08A' : '#7b7e83'}
            strokeWidth={entryPulse ? 2 : 1.5}
            filter={entryPulse ? 'drop-shadow(0 0 10px rgba(95, 208, 138, 0.8))' : undefined}
          />
          <rect x={152} y={188} width={40} height={22} rx={3} fill="#0d0e10" stroke="#35383c" strokeWidth={1} />
          <circle
            cx={190}
            cy={184}
            r={entryPulse ? 3.5 : 2.5}
            fill={entryPulse ? '#5FD08A' : '#EF6B6B'}
            filter={entryPulse ? 'drop-shadow(0 0 6px #5FD08A)' : 'drop-shadow(0 0 4px #EF6B6B)'}
          />

          <g id="twin-entry-plate" transform="translate(100, 192)">
            <rect x={0} y={0} width={38} height={20} rx={4} fill="#1d1f22" stroke="#7b7e83" strokeWidth={1.5} />
            <text x={19} y={13} textAnchor="middle" fill="#d2c8bb" fontSize={8} fontFamily="Hanken Grotesk, system-ui, sans-serif" fontWeight="700" letterSpacing="0.05em">
              ENTRY
            </text>
          </g>

          <rect x={205} y={220} width={8} height={14} rx={2} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />
          <rect x={205} y={356} width={8} height={14} rx={2} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />

          <g
            style={{
              transform: `rotate(${barrierAngle}deg)`,
              transformOrigin: `209px ${LANE0_LED_Y}px`,
              transition: 'transform 0.1s linear',
            }}
          >
            <rect x={206} y={LANE0_LED_Y} width={6} height={126} rx={2} fill="url(#twin-barrier-stripes)" stroke="#1C1917" strokeWidth={0.75} />
          </g>
          <circle cx={209} cy={LANE0_LED_Y} r={3.5} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />
          <circle cx={209} cy={LANE0_LED_Y} r={1.5} fill="#FFFFFF" />
        </g>

        {/* 2. WS2812 LED STRIPS (REUSING LedStripSvg DIRECTLY) */}
        <LedStripSvg
          ledFrame={ledFrame}
          startX={START_X}
          lane0Y={LANE0_LED_Y}
          lane1Y={LANE1_LED_Y}
          totalWidth={TOTAL_STRIP_WIDTH}
          slotWidth={SLOT_WIDTH}
          slotGap={0}
          ignoreFxStore={true}
        />

        {/* 3. 8 PARKING SLOTS (REUSING SlotCard DIRECTLY) */}
        <g id="twin-slots-layer">
          {slotStates.slice(0, 4).map((item, idx) => {
            const slotX = START_X + idx * SLOT_WIDTH;
            return (
              <SlotCard
                key={`slot-card-${item.slot.slotIndex}`}
                slot={item.slot}
                lane={0}
                x={slotX}
                y={0}
                width={SLOT_WIDTH}
                height={SLOT_HEIGHT}
                isSelected={false}
                onClick={() => {}}
                hideDistance={false}
                isDimmedOverride={item.isDimmed}
                isCandidateGlowOverride={item.isCandidateGlow}
                isTargetRingOverride={item.isTargetRing}
                isSensorGlowOverride={item.isSensorGlow}
                pillStateOverride={item.pillState}
                sensorToneOverride={item.sensorTone}
                hideCarSprite={item.hideCarSprite}
              />
            );
          })}

          {slotStates.slice(4, 8).map((item, idx) => {
            const slotX = START_X + idx * SLOT_WIDTH;
            return (
              <SlotCard
                key={`slot-card-${item.slot.slotIndex}`}
                slot={item.slot}
                lane={1}
                x={slotX}
                y={LANE1_LED_Y}
                width={SLOT_WIDTH}
                height={SLOT_HEIGHT}
                isSelected={false}
                onClick={() => {}}
                hideDistance={false}
                isDimmedOverride={item.isDimmed}
                isCandidateGlowOverride={item.isCandidateGlow}
                isTargetRingOverride={item.isTargetRing}
                isSensorGlowOverride={item.isSensorGlow}
                pillStateOverride={item.pillState}
                sensorToneOverride={item.sensorTone}
                hideCarSprite={item.hideCarSprite}
              />
            );
          })}
        </g>

        {/* =================================================================== */}
        {/* 4. GUIDANCE ROUTES (CLAIM 12 AND CLAIM 7)                           */}
        {/* =================================================================== */}
        {/* Route 1: Gate to S2 (Claim 7 Phase 1) OR Gate to S3 (Claim 12) */}
        {guidanceRoute1 && (
          <g id="twin-route1-layer" opacity={guidanceRoute1.opacity} className="pointer-events-none select-none">
            {claimId === 'claim7' ? (
              // Path to S2: Gate (210) to S2 (609) matching original layout NavigationRoute
              <>
                <path
                  id="twin-guidance-path-s2"
                  d="M 210 295 L 577 295 C 595 295 609 271 609 244.5"
                  fill="none"
                  stroke="transparent"
                />
                {/* 1. Recessed asphalt channel groove */}
                <path d="M 210 295 L 577 295 C 595 295 609 271 609 244.5" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 210 295 L 577 295 C 595 295 609 271 609 244.5" fill="none" stroke="#0c0d0f" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />

                {/* 2. Soft natural light diffusion */}
                <path d="M 210 295 L 577 295 C 595 295 609 271 609 244.5" fill="none" stroke="rgba(0, 255, 0, 0.12)" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 210 295 L 577 295 C 595 295 609 271 609 244.5" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />

                {/* 3. Pass-over dotted studs past occupied slot S1 (210 to 482) */}
                <line
                  x1={210}
                  y1={295}
                  x2={482}
                  y2={295}
                  stroke="#00FF00"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="0.01 6"
                  opacity={0.95}
                  filter="url(#twin-green-glow)"
                />

                {/* 4. Active guidance turn-in curve into S2 */}
                <g id="twin-turn-in-s2">
                  <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                  <path
                    d="M 482 295 L 577 295 C 595 295 609 271 609 244.5"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                    filter="url(#twin-green-glow)"
                  />
                  <path
                    d="M 482 295 L 577 295 C 595 295 609 271 609 244.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                    opacity={0.95}
                  />
                </g>

                {/* 5. Directional turn-in chevrons pointing into S2 */}
                <g id="twin-target-chevrons-s2" filter="url(#twin-green-glow)">
                  <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                  <path d="M 603 244.5 L 609 233.5 L 615 244.5" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 603 244.5 L 609 233.5 L 615 244.5" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 603 244.5 L 609 233.5 L 615 244.5" fill="none" stroke="#00FF00" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 603 244.5 L 609 233.5 L 615 244.5" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                  <path d="M 604.5 250.5 L 609 239.5 L 613.5 250.5" fill="none" stroke="#00FF00" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
                </g>

                {/* 6. In-channel sequential comet pulse */}
                <g id="twin-in-channel-pulse-s2">
                  <g>
                    <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
                      <mpath href="#twin-guidance-path-s2" />
                    </animateMotion>
                    <circle r={7} fill="rgba(0, 255, 0, 0.40)" />
                    <circle r={4.2} fill="#00FF00" stroke="#00FF00" strokeWidth={1} filter="drop-shadow(0 0 6px rgba(0, 255, 0, 0.95))" />
                    <circle r={2.2} fill="#FFFFFF" />
                  </g>
                </g>
              </>
            ) : (
              // Path to S3: Gate (210) to S3 (799) matching original layout NavigationRoute
              <>
                <path
                  id="twin-guidance-path-s3"
                  d="M 210 295 L 767 295 C 785 295 799 271 799 244.5"
                  fill="none"
                  stroke="transparent"
                />

                {/* 1. Recessed asphalt channel groove */}
                <path d="M 210 295 L 767 295 C 785 295 799 271 799 244.5" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 210 295 L 767 295 C 785 295 799 271 799 244.5" fill="none" stroke="#0c0d0f" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />

                {/* 2. Soft natural light diffusion on asphalt */}
                <path d="M 210 295 L 767 295 C 785 295 799 271 799 244.5" fill="none" stroke="rgba(0, 255, 0, 0.12)" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 210 295 L 767 295 C 785 295 799 271 799 244.5" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />

                {/* 3. Pass-over dotted studs past occupied slots S1 (210 to 482) and S2 (482 to 767) */}
                <line
                  x1={210}
                  y1={295}
                  x2={482}
                  y2={295}
                  stroke="#00FF00"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="0.01 6"
                  opacity={0.95}
                  filter="url(#twin-green-glow)"
                />
                <line
                  x1={482}
                  y1={295}
                  x2={767}
                  y2={295}
                  stroke="#00FF00"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="0.01 6"
                  opacity={0.95}
                  filter="url(#twin-green-glow)"
                />

                {/* 4. Active guidance turn-in curve into S3 */}
                <g id="twin-turn-in-s3">
                  <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                  <path
                    d="M 767 295 C 785 295 799 271 799 244.5"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                    filter="url(#twin-green-glow)"
                  />
                  <path
                    d="M 767 295 C 785 295 799 271 799 244.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                    opacity={0.95}
                  />
                </g>

                {/* 5. Directional turn-in chevrons pointing into S3 (Exact Original Layout) */}
                <g id="twin-target-chevrons-s3" filter="url(#twin-green-glow)">
                  <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                  {/* Recessed asphalt bed */}
                  <path
                    d="M 793 244.5 L 799 233.5 L 805 244.5"
                    fill="none"
                    stroke="#16181b"
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Soft green diffusion */}
                  <path
                    d="M 793 244.5 L 799 233.5 L 805 244.5"
                    fill="none"
                    stroke="rgba(0, 255, 0, 0.25)"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Glowing emerald diode */}
                  <path
                    d="M 793 244.5 L 799 233.5 L 805 244.5"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Intense bright white diamond core */}
                  <path
                    d="M 793 244.5 L 799 233.5 L 805 244.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                  {/* Secondary trailing subtle chevron */}
                  <path
                    d="M 794.5 250.5 L 799 239.5 L 803.5 250.5"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth={2.0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.75}
                  />
                </g>

                {/* 6. In-channel sequential light pulse (comet ripple to S3) */}
                <g id="twin-in-channel-pulse-s3">
                  <g>
                    <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
                      <mpath href="#twin-guidance-path-s3" />
                    </animateMotion>
                    {/* Soft ambient green light aura */}
                    <circle r={7} fill="rgba(0, 255, 0, 0.40)" />
                    {/* Luminous emerald comet outer ring */}
                    <circle
                      r={4.2}
                      fill="#00FF00"
                      stroke="#00FF00"
                      strokeWidth={1}
                      filter="drop-shadow(0 0 6px rgba(0, 255, 0, 0.95))"
                    />
                    {/* Intense bright white diamond core */}
                    <circle r={2.2} fill="#FFFFFF" />
                  </g>
                </g>
              </>
            )}
          </g>
        )}

        {/* Route 2: Car A current position (480) to S7 (Claim 7 Phase 2) */}
        {guidanceRoute2 && (
          <g id="twin-route2-layer" opacity={guidanceRoute2.opacity} className="pointer-events-none select-none">
            <path d="M 480 295 L 767 295 C 785 295 799 319 799 349" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 480 295 L 767 295 C 785 295 799 319 799 349" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M 480 295 L 767 295 C 785 295 799 319 799 349"
              fill="none"
              stroke="#00FF00"
              strokeWidth={3}
              strokeDasharray="8 4"
              strokeDashoffset={350 * (1 - guidanceRoute2.drawProgress)}
              strokeLinecap="round"
              filter="url(#twin-green-glow)"
            />
            <path
              d="M 480 295 L 767 295 C 785 295 799 319 799 349"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              strokeDasharray="8 4"
              strokeDashoffset={350 * (1 - guidanceRoute2.drawProgress)}
              strokeLinecap="round"
              opacity={0.9}
            />
            {guidanceRoute2.drawProgress > 0.85 && (
              <g id="twin-target-chevrons-reroute" filter="url(#twin-green-glow)">
                <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                <path d="M 793 338 L 799 349 L 805 338" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 793 338 L 799 349 L 805 338" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 793 338 L 799 349 L 805 338" fill="none" stroke="#00FF00" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 793 338 L 799 349 L 805 338" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                <path d="M 794.5 332 L 799 343 L 803.5 332" fill="none" stroke="#00FF00" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
              </g>
            )}
          </g>
        )}

        {/* Claim 7 Re-scan Shimmer Beam (Step 4) */}
        {shimmerX !== null && (
          <g id="twin-rescan-shimmer" transform={`translate(${shimmerX}, 0)`} className="pointer-events-none select-none">
            <rect x={-15} y={4} width={30} height={582} fill="rgba(224, 168, 75, 0.12)" filter="url(#twin-gold-glow)" />
            <line x1={0} y1={4} x2={0} y2={586} stroke="#E0A84B" strokeWidth={2} strokeLinecap="round" filter="url(#twin-gold-glow)" />
            <line x1={0} y1={6} x2={0} y2={584} stroke="#FFFFFF" strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
          </g>
        )}

        {/* =================================================================== */}
        {/* 5. DYNAMIC CAR SPRITES (CAR A & CAR B)                              */}
        {/* =================================================================== */}
        {/* Car B (Sunset Amber #EA580C) in Claim 7 */}
        {movingCarB && (
          <g
            id="twin-moving-car-b"
            transform={`translate(${movingCarB.x}, ${movingCarB.y}) rotate(${movingCarB.rotation})`}
            className="pointer-events-none select-none"
          >
            {movingCarB.headlights && (
              <g id="twin-car-b-headlights" className="pointer-events-none">
                <polygon points="76,-16 260,-48 260,10 76,-6" fill="url(#twin-headlight-cone)" />
                <polygon points="76,6 260,-10 260,48 76,16" fill="url(#twin-headlight-cone)" />
              </g>
            )}
            <g transform="translate(-76, -41)">
              <CarSvg width={152} height={82} color="#EA580C" orientation="landscape" />
            </g>
            {movingCarB.brakeLights && (
              <g id="twin-brake-lights-b">
                <circle cx={-72} cy={-22} r={5.5} fill="#EF4444" filter="drop-shadow(0 0 6px #EF4444)" />
                <circle cx={-72} cy={22} r={5.5} fill="#EF4444" filter="drop-shadow(0 0 6px #EF4444)" />
                <circle cx={-72} cy={-22} r={2.5} fill="#FECACA" />
                <circle cx={-72} cy={22} r={2.5} fill="#FECACA" />
              </g>
            )}
          </g>
        )}

        {/* Car A (Electric Royal Blue #2563EB) in Claim 7 or Claim 12 */}
        {movingCarA && (
          <g
            id="twin-moving-car-a"
            transform={`translate(${movingCarA.x}, ${movingCarA.y}) rotate(${movingCarA.rotation})`}
            className="pointer-events-none select-none"
          >
            {movingCarA.headlights && (
              <g id="twin-car-a-headlights" className="pointer-events-none">
                <polygon points="76,-16 260,-48 260,10 76,-6" fill="url(#twin-headlight-cone)" />
                <polygon points="76,6 260,-10 260,48 76,16" fill="url(#twin-headlight-cone)" />
              </g>
            )}
            <g transform="translate(-76, -41)">
              <CarSvg width={152} height={82} color={movingCarA.color ?? '#2563EB'} orientation="landscape" />
            </g>
            {movingCarA.brakeLights && (
              <g id="twin-brake-lights-a">
                <circle cx={-72} cy={-22} r={5.5} fill="#EF4444" filter="drop-shadow(0 0 6px #EF4444)" />
                <circle cx={-72} cy={22} r={5.5} fill="#EF4444" filter="drop-shadow(0 0 6px #EF4444)" />
                <circle cx={-72} cy={-22} r={2.5} fill="#FECACA" />
                <circle cx={-72} cy={22} r={2.5} fill="#FECACA" />
              </g>
            )}
          </g>
        )}

        {/* =================================================================== */}
        {/* 6. CLAIM 5 OVERLAYS                                                 */}
        {/* =================================================================== */}
        {claimId === 'claim5' && (
          <g id="twin-claim5-overlay" className="pointer-events-none select-none">
            {/* Steps 2-4: Candidate position lines with green direction arrows for all free bays */}
            {claim5DottedLines.map((line) => {
              // Before scanning (< 7.0s), all free bays have identical green direction paths & arrows.
              // At Step 4 (7.0s - 8.5s), the lowest position winners (S1 & S5) brighten while others fade.
              const strokeColor = line.isWinner && time >= 7.0 ? '#00FF00' : '#5FD08A';
              const strokeW = line.isWinner && time >= 7.0 ? 2.5 : 1.8;
              const filterUrl = 'url(#twin-green-glow)';
              const isUpper = line.slotIndex < 4;
              const col = line.slotIndex % 4;
              const cx = SLOT_CENTERS_X[col];

              return (
                <g key={`dotted-line-${line.slotIndex}`} opacity={line.opacity}>
                  <path
                    d={line.path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    strokeDasharray="4 4"
                    strokeDashoffset={line.totalLength * (1 - line.drawProgress)}
                    style={{
                      strokeDasharray: '4 4',
                      strokeDashoffset: `${line.totalLength * (1 - line.drawProgress)}`,
                    }}
                    strokeLinecap="round"
                    filter={filterUrl}
                  />
                  <circle cx={210} cy={isUpper ? 280 : 310} r={3} fill={strokeColor} opacity={0.8} />
                  {line.drawProgress > 0.85 && (
                    <g filter={filterUrl}>
                      {/* Green Direction Arrow Chevron pointing into the slot */}
                      <path
                        d={
                          isUpper
                            ? `M ${cx - 5.5} 241 L ${cx} 232 L ${cx + 5.5} 241`
                            : `M ${cx - 5.5} 349 L ${cx} 358 L ${cx + 5.5} 349`
                        }
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Step 5: The nearest slot is picked (S6) */}
            {/* Original green guidance path with direction arrow chevrons and blinking green strip light */}
            {time >= 8.5 && (
              <g id="twin-claim5-step5-guidance" opacity={clamp((time - 8.5) / 0.35, 0, 1)}>
                {/* Gate (210) to Slot S6 (609, Lower row) */}
                <g id="twin-claim5-route-s6">
                  {/* Recessed tarmac groove */}
                  <path d="M 210 295 L 577 295 C 595 295 609 319 609 349" fill="none" stroke="#16181b" strokeWidth={4.5} strokeLinecap="round" />
                  {/* Green light diffusion */}
                  <path d="M 210 295 L 577 295 C 595 295 609 319 609 349" fill="none" stroke="rgba(0, 255, 0, 0.25)" strokeWidth={8} strokeLinecap="round" />
                  {/* Emerald dashed guidance line */}
                  <path
                    d="M 210 295 L 577 295 C 595 295 609 319 609 349"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    filter="url(#twin-green-glow)"
                  />
                  {/* Optical core */}
                  <path
                    d="M 210 295 L 577 295 C 595 295 609 319 609 349"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    opacity={0.95}
                  />
                  {/* Directional Chevron Arrows Pointing DOWN into S6 */}
                  <g id="twin-target-chevrons-s6" filter="url(#twin-green-glow)">
                    <animate attributeName="opacity" values="1;0.25;1" dur="0.6s" repeatCount="indefinite" />
                    <path d="M 603 349 L 609 360 L 615 349" fill="none" stroke="#00FF00" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 603 349 L 609 360 L 615 349" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 604.5 343 L 609 354 L 613.5 343" fill="none" stroke="#00FF00" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
                  </g>
                </g>
              </g>
            )}

            {claim5Flashes.map((fl, fIdx) => (
              <g key={`scan-flash-${fIdx}`} opacity={fl.opacity}>
                <circle
                  cx={fl.cx}
                  cy={fl.cy}
                  r={55}
                  fill="radial-gradient(circle, rgba(95,208,138,0.5) 0%, rgba(224,168,75,0) 70%)"
                  stroke="#5FD08A"
                  strokeWidth={2}
                  filter="url(#twin-green-glow)"
                />
              </g>
            ))}

            {claim5ScanX !== null && (
              <g id="twin-vertical-scanner" transform={`translate(${claim5ScanX}, 0)`}>
                <rect x={-10} y={4} width={20} height={582} fill="rgba(224, 168, 75, 0.14)" filter="url(#twin-gold-glow)" />
                <line x1={0} y1={4} x2={0} y2={586} stroke="#E0A84B" strokeWidth={2.5} strokeLinecap="round" filter="url(#twin-gold-glow)" />
                <line x1={0} y1={6} x2={0} y2={584} stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" opacity={0.85} />
                <polygon points="0,2 6,8 0,14 -6,8" fill="#E0A84B" filter="url(#twin-gold-glow)" />
                <polygon points="0,588 6,582 0,576 -6,582" fill="#E0A84B" filter="url(#twin-gold-glow)" />
              </g>
            )}
          </g>
        )}

        {/* =================================================================== */}
        {/* 7. SENSOR PULSES, WAVES & DATA PACKETS (CLAIM 2 & CLAIM 7 STEP 3)   */}
        {/* =================================================================== */}
        <g id="twin-pulses-layer" className="pointer-events-none select-none">
          {powerPulses.map((p, idx) => {
            const isUpper = p.slotIndex < 4;
            const col = p.slotIndex % 4;
            const cx = SLOT_CENTERS_X[col];
            const cy = isUpper ? 15 : 575;

            return (
              <circle
                key={`power-pulse-${idx}`}
                cx={cx}
                cy={cy}
                r={p.radius}
                fill="none"
                stroke="#6FB8D6"
                strokeWidth={1.8}
                opacity={p.opacity}
                filter="url(#twin-cyan-glow)"
              />
            );
          })}

          {waves.map((w) => {
            const isUpper = w.slotIndex < 4;
            const col = w.slotIndex % 4;
            const cx = SLOT_CENTERS_X[col];
            const strokeColor = w.color === 'red' ? '#EF6B6B' : w.color === 'green' ? '#5FD08A' : '#6FB8D6';
            const arcDepth = isUpper
              ? (w.direction === 'returnFast' ? -12 : 14)
              : (w.direction === 'returnFast' ? 12 : -14);

            return (
              <g key={w.id} opacity={w.opacity}>
                <path
                  d={`M ${cx - w.arcRadius} ${w.y} Q ${cx} ${w.y + arcDepth} ${cx + w.arcRadius} ${w.y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={w.direction === 'returnSlow' ? 1.4 : 2.0}
                  strokeLinecap="round"
                  filter={w.direction !== 'returnSlow' ? 'url(#twin-cyan-glow)' : undefined}
                />
              </g>
            );
          })}

          {contactPings.map((cp, idx) => (
            <circle
              key={`contact-ping-${idx}`}
              cx={cp.x}
              cy={cp.y}
              r={cp.radius}
              fill="none"
              stroke={cp.color}
              strokeWidth={1.8}
              opacity={cp.opacity}
              filter="url(#twin-cyan-glow)"
            />
          ))}

          {dataPackets.map((pkt) => {
            const isUpper = pkt.slotIndex < 4;
            const col = pkt.slotIndex % 4;
            const cx = SLOT_CENTERS_X[col];
            const startY = isUpper ? 15 : 575;
            const borderY = isUpper ? 2 : 588;
            const boothX = 172;
            const boothY = 176;

            let px = cx;
            let py = startY;

            if (pkt.progress < 0.2) {
              const sub = pkt.progress / 0.2;
              py = startY + (borderY - startY) * sub;
            } else if (pkt.progress < 0.8) {
              const sub = (pkt.progress - 0.2) / 0.6;
              py = borderY;
              px = cx + (boothX - cx) * sub;
            } else {
              const sub = (pkt.progress - 0.8) / 0.2;
              px = boothX;
              py = borderY + (boothY - borderY) * sub;
            }

            const colHex = pkt.color === 'red' ? '#EF6B6B' : '#5FD08A';

            return (
              <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                <circle r={4.5} fill={colHex} filter="drop-shadow(0 0 6px rgba(255,255,255,0.9))" />
                <circle r={8} fill="none" stroke={colHex} strokeWidth={1} opacity={0.6} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default TopDownTwinStage;
