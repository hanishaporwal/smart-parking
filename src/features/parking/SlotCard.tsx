import React, { useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SlotState } from '@/engine';
import { useSimStore } from '@/store';
import { useScenarioStore } from '@/scenarios';
import { useFxStore } from '@/scenarios/fx';
import { t } from '@/scenarios/pacing';
import { CarSvg } from './CarSvg';

export interface SlotCardProps {
  slot: SlotState;
  lane: 0 | 1;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onClick: (e?: React.MouseEvent<SVGGElement> | React.KeyboardEvent<SVGGElement>) => void;
  orientation?: 'top' | 'bottom';
  hideDistance?: boolean;
  isDimmedOverride?: boolean;
  isSensorGlowOverride?: boolean;
  isCandidateGlowOverride?: boolean;
  isTargetRingOverride?: boolean;
  pillStateOverride?: 'VACANT' | 'OCCUPIED' | 'TARGET' | 'HIDDEN';
  sensorToneOverride?: 'red' | 'green' | 'blue';
  hideCarSprite?: boolean;
}

// Realistic automotive paint finishes matching user reference photo
const CAR_COLORS = [
  '#e13636ff', // Crimson Red (Slot 1 in reference)
  '#2563EB', // Electric Royal Blue (Slot 2 in reference)
  '#EAB308', // Sunflower Yellow (Slot 3 in reference)
  '#94A3B8', // Silver Metallic
  '#2A2E35', // Metallic Charcoal
  '#F8FAFC', // Pearl White
  '#EA580C', // Sunset Amber
  '#0D9488', // Emerald Teal
];

export const SlotCard: React.FC<SlotCardProps> = React.memo(
  ({
    slot,
    lane,
    x,
    y,
    width,
    height,
    isSelected: _isSelected = false,
    onClick,
    hideDistance: _hideDistance = false,
    isDimmedOverride,
    isSensorGlowOverride,
    isCandidateGlowOverride,
    isTargetRingOverride,
    pillStateOverride,
    sensorToneOverride,
    hideCarSprite,
  }) => {
    const slotNum = slot.slotIndex + 1;
    const isOccupied = slot.occupied;
    const isTarget = slot.isTarget;
    const fault = useSimStore(s => s.sensorFaults[slot.slotIndex]);
    const highlightSubsystem = useScenarioStore(s => s.highlightSubsystem);
    const activeCarAnimation = useScenarioStore(s => s.activeCarAnimation);
    const candidateGlowSlots = useScenarioStore(s => s.candidateGlowSlots);
    const dimmedSlots = useScenarioStore(s => s.dimmedSlots);
    const flashingSensors = useScenarioStore(s => s.flashingSensors);
    const shouldReduceMotion = useReducedMotion();

    // FX Store hookups
    const activeSonar = useFxStore(s => s.activeSonars.find(sn => sn.slot === slot.slotIndex));
    const isSensorGlow = isSensorGlowOverride !== undefined ? isSensorGlowOverride : useFxStore(s => s.sensorGlows.includes(slot.slotIndex));
    const readout = useFxStore(s => s.readouts[slot.slotIndex]);
    const pillOverride = useFxStore(s => s.pillOverrides[slot.slotIndex]);
    const isTargetRing = isTargetRingOverride !== undefined ? isTargetRingOverride : (useFxStore(s => s.targetRings?.slots.includes(slot.slotIndex)) && !slot.occupied);
    const fxDimLevel = useFxStore(s => s.dimmedSlots[slot.slotIndex]);
    const isCandidateHalo = useFxStore(s => s.candidateHalos.includes(slot.slotIndex));
    const rankBadge = useFxStore(s => s.rankBadges[slot.slotIndex]);

    const isDimmed = isDimmedOverride !== undefined ? isDimmedOverride : dimmedSlots?.includes(slot.slotIndex);
    const isCandidateGlow = isCandidateGlowOverride !== undefined ? isCandidateGlowOverride : (candidateGlowSlots?.includes(slot.slotIndex) || isCandidateHalo);

    // Brief sensor outline brightening on occupancy state change
    const [sensorFlash, setSensorFlash] = useState(false);
    const prevOccupiedRef = useRef(slot.occupied);

    useEffect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (prevOccupiedRef.current !== slot.occupied) {
        prevOccupiedRef.current = slot.occupied;
        setSensorFlash(true);
        timer = setTimeout(() => setSensorFlash(false), 500);
      }
      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [slot.occupied]);

    // Effective status considering pillOverride or prop override
    const effectiveTarget = pillStateOverride ? pillStateOverride === 'TARGET' : (pillOverride ? pillOverride.state === 'TARGET' : isTarget);
    const effectiveOccupied = pillStateOverride ? pillStateOverride === 'OCCUPIED' : (pillOverride ? pillOverride.state === 'OCCUPIED' : isOccupied);

    // Status Styling Colors: Seamless asphalt floor with subtle status ambient glow
    const borderColor = 'transparent';

    const bgFill = effectiveTarget
      ? 'rgba(224, 168, 75, 0.12)'
      : effectiveOccupied
        ? 'rgba(239, 107, 107, 0.08)'
        : 'transparent';

    const statusText = effectiveTarget
      ? 'TARGET GUIDANCE'
      : effectiveOccupied
        ? 'OCCUPIED'
        : 'VACANT';

    const statusBadgeColor = effectiveTarget
      ? '#E0A84B'
      : effectiveOccupied
        ? '#EF6B6B'
        : '#5FD08A';

    const pillBg = effectiveTarget
      ? 'rgba(224, 168, 75, 0.18)'
      : effectiveOccupied
        ? 'rgba(239, 107, 107, 0.18)'
        : 'rgba(95, 208, 138, 0.18)';

    // Proportional Layout Calculations (Taller Vertical Rectangle ~3:4 aspect ratio)
    // 1. Realistic HC-SR04 Sensor Package (dual-barrel module matching Fig 3)
    const sensorW = 52;
    const sensorH = 18;
    const sensorX = (width - sensorW) * 0.5; // Horizontally centred in each slot card
    // Lane 0: 6px inset from top edge; Lane 1: 6px inset from bottom edge
    const sensorY = lane === 0 ? 6 : height - 6 - sensorH;

    // Transducer positions & radii
    const transducerR = 6.2;
    const leftTransducerX = sensorX + 14.5;
    const rightTransducerX = sensorX + sensorW - 14.5;
    const transducerY = lane === 0 ? sensorY + 8.5 : sensorY + 9.5;

    // 2. Car Sprite: 70% of slot height by 50% of slot width (aspect ~1:2), centred in the slot
    const carW = width * 0.50;
    const carH = height * 0.70;
    const carCenterX = width * 0.5;
    const carCenterY = height * 0.50;
    const carX = carCenterX - carW * 0.5;
    const carY = carCenterY - carH * 0.5;

    // 3. Status Pill: horizontally centred at aisle side, sleek compact design
    const pillW = Math.round(width * 0.44);
    const pillH = 18;
    const pillX = (width - pillW) * 0.5;
    // Lane 0 (aisle at bottom): 7px gap from bottom edge; Lane 1 (aisle at top): 7px gap from top edge
    const pillY = lane === 0 ? height - pillH - 7 : 7;

    // Wheel stop dimensions: sits outside the car at the sensor-wall end of the bay
    const wheelStopW = width * 0.45;
    const wheelStopH = 4;
    const wheelStopX = (width - wheelStopW) * 0.5;
    const wheelStopY = lane === 0 ? height * 0.13 + 1.5 : height * 0.87 - 5.5;

    // Orientation:
    // Top lane (lane 0): aisle at bottom, sensor wall at top -> headlights at bottom (down), red tail lights at top
    // Bottom lane (lane 1): aisle at top, sensor wall at bottom -> headlights at top (up), red tail lights at bottom
    const carFacing: 'up' | 'down' = lane === 0 ? 'down' : 'up';

    // Animation state
    const isThisSlotCar = activeCarAnimation?.slotIndex === slot.slotIndex;
    const isArriving = isThisSlotCar && activeCarAnimation?.type === 'arrive';
    const isLeaving = isThisSlotCar && activeCarAnimation?.type === 'leave';

    return (
      <g
        id={`slot-card-${slot.slotIndex}`}
        data-slot-num={slotNum}
        transform={`translate(${x}, ${y})`}
        opacity={isDimmed ? 0.45 : fxDimLevel !== undefined ? fxDimLevel : 1}
        className="cursor-pointer transition-all select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{ transitionDuration: `${t(200)}ms` }}
        onClick={e => onClick(e)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Parking Slot S${slotNum}, Status: ${statusText}, Distance: ${slot.distance} centimeters${fault && fault !== 'none' ? `, Sensor Fault: ${fault}` : ''
          }`}
      >
        {/* FX Target Ring */}
        {isTargetRing && (
          <rect
            id={`slot-target-ring-S${slotNum}`}
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            rx={6}
            fill="none"
            stroke="#E0A84B"
            strokeWidth={2}
            className="motion-safe:animate-pulse"
            style={{ animationDuration: '1.5s' }}
            filter="drop-shadow(0 0 8px rgba(224, 168, 75, 0.85))"
          />
        )}

        {/* Candidate Halo: soft green breathing halo around card (1.6 s loop) */}
        {isCandidateGlow && (
          <rect
            id={`slot-candidate-halo-S${slotNum}`}
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            rx={6}
            fill="none"
            stroke="#5FD08A"
            strokeWidth={2}
            className="motion-safe:animate-pulse"
            style={{ animationDuration: `${shouldReduceMotion ? '0s' : '1.6s'}` }}
            filter="drop-shadow(0 0 8px rgba(95, 208, 138, 0.85))"
          />
        )}

        {/* Claim Subsystem: Red LEDs highlight for occupied bays */}
        {highlightSubsystem === 'redLeds' && isOccupied && (
          <rect
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            rx={6}
            fill="none"
            stroke="#EF6B6B"
            strokeWidth={2}
            className="motion-safe:animate-pulse"
            style={{ animationDuration: `${(t(2000) / 1000).toFixed(2)}s` }}
            filter="drop-shadow(0 0 6px rgba(239, 107, 107, 0.75))"
          />
        )}

        {/* Claim Subsystem: Explicit Slot Ring (The Yellow Box, perfectly aligned in slot space) */}
        {highlightSubsystem === `slot:S${slotNum}` && (
          <rect
            id={`slot-highlight-ring-S${slotNum}`}
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            rx={6}
            fill="none"
            stroke="#E0A84B"
            strokeWidth={2}
            className="motion-safe:animate-pulse"
            style={{ animationDuration: `${(t(2000) / 1000).toFixed(2)}s` }}
            filter="drop-shadow(0 0 8px rgba(224, 168, 75, 0.85))"
          />
        )}

        {/* Claim Subsystem: Dim Ring for Claim 5 Step 2 */}
        {highlightSubsystem === 'dim:S3,S7' && (slotNum === 3 || slotNum === 7) && (
          <rect
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            rx={6}
            fill="none"
            stroke="#E0A84B"
            strokeWidth={1.5}
            opacity={0.5}
            strokeDasharray="6 3"
          />
        )}

        {/* Main Bay Floor: Perfectly aligned within slot boundaries */}
        <rect
          id={`slot-bay-floor-S${slotNum}`}
          x={2}
          y={2}
          width={width - 4}
          height={height - 4}
          rx={6}
          fill={bgFill}
          stroke={borderColor}
          strokeWidth={effectiveTarget || effectiveOccupied ? 2 : 1.5}
          className="transition-colors group-hover:fill-opacity-25"
          style={{ transitionDuration: `${t(300)}ms` }}
        />


        {/* Realistic Wheel Stop (rounded bar at the sensor-wall end of the bay) */}
        <g id={`wheel-stop-S${slotNum}`}>
          <rect
            x={wheelStopX}
            y={wheelStopY}
            width={wheelStopW}
            height={wheelStopH}
            rx={3}
            fill="#1C1815"
            stroke="rgba(46, 40, 35, 0.7)"
            strokeWidth={1}
          />
          {/* Wheel stop top highlight */}
          <line
            x1={wheelStopX + 3}
            y1={wheelStopY + 1.5}
            x2={wheelStopX + wheelStopW - 3}
            y2={wheelStopY + 1.5}
            stroke="#A99F92"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.6}
          />
        </g>

        {/* =================================================================== */}
        {/* HC-SR04 ULTRASONIC SENSOR (FAR WALL, HORIZONTALLY CENTRED)          */}
        {/* High-fidelity dual-barrel module matching Fig 3 with blue accents    */}
        {/* =================================================================== */}
        <g id={`sensor-S${slotNum}`} aria-label={`S${slotNum} ultrasonic sensor`} role="img">
          {/* Sonar Pulse Arcs expanding toward the bay */}
          {!shouldReduceMotion && (
            <g opacity={activeSonar ? 0.95 : 0.4}>
              <motion.path
                d={
                  lane === 0
                    ? `M ${sensorX + 8} ${sensorY + sensorH + 3} Q ${sensorX + sensorW * 0.5} ${sensorY + sensorH + 13} ${sensorX + sensorW - 8} ${sensorY + sensorH + 3}`
                    : `M ${sensorX + 8} ${sensorY - 3} Q ${sensorX + sensorW * 0.5} ${sensorY - 13} ${sensorX + sensorW - 8} ${sensorY - 3}`
                }
                fill="none"
                stroke={activeSonar?.tone === 'red' ? '#EF6B6B' : activeSonar?.tone === 'green' ? '#5FD08A' : '#6FB8D6'}
                strokeWidth={activeSonar ? 2 : 1.5}
                strokeLinecap="round"
                initial={{ opacity: 0.8, y: 0 }}
                animate={{ opacity: 0, y: lane === 0 ? 16 : -16 }}
                transition={{
                  repeat: activeSonar ? undefined : Infinity,
                  duration: activeSonar ? t(activeSonar.duration || 900) / 1000 : 1.5,
                  ease: 'easeOut',
                }}
              />
              <motion.path
                d={
                  lane === 0
                    ? `M ${sensorX + 13} ${sensorY + sensorH + 3} Q ${sensorX + sensorW * 0.5} ${sensorY + sensorH + 9} ${sensorX + sensorW - 13} ${sensorY + sensorH + 3}`
                    : `M ${sensorX + 13} ${sensorY - 3} Q ${sensorX + sensorW * 0.5} ${sensorY - 9} ${sensorX + sensorW - 13} ${sensorY - 3}`
                }
                fill="none"
                stroke={activeSonar?.tone === 'red' ? '#EF6B6B' : activeSonar?.tone === 'green' ? '#5FD08A' : '#6FB8D6'}
                strokeWidth={activeSonar ? 1.6 : 1.2}
                strokeLinecap="round"
                initial={{ opacity: 0.7, y: 0 }}
                animate={{ opacity: 0, y: lane === 0 ? 14 : -14 }}
                transition={{
                  repeat: activeSonar ? undefined : Infinity,
                  duration: activeSonar ? t(activeSonar.duration || 900) / 1000 : 1.5,
                  delay: activeSonar ? (t(activeSonar.duration || 900) * 0.2) / 1000 : 0.5,
                  ease: 'easeOut',
                }}
              />
            </g>
          )}

          {/* 4-Pin Header Block (Wall Side) */}
          <rect
            x={sensorX + sensorW * 0.5 - 7}
            y={lane === 0 ? sensorY - 2.5 : sensorY + sensorH - 0.5}
            width={14}
            height={3}
            rx={1}
            fill="#1C1815"
            stroke="#3A332D"
            strokeWidth={0.75}
          />
          {[0, 1, 2, 3].map(i => (
            <circle
              key={i}
              cx={sensorX + sensorW * 0.5 - 4.5 + i * 3}
              cy={lane === 0 ? sensorY - 1 : sensorY + sensorH + 1}
              r={0.65}
              fill="#A99F92"
            />
          ))}

          {/* Sensor Board Rectangle (PCB) */}
          <rect
            x={sensorX}
            y={sensorY}
            width={sensorW}
            height={sensorH}
            rx={4}
            fill="#151210"
            stroke={
              sensorToneOverride === 'red'
                ? '#EF6B6B'
                : sensorToneOverride === 'green'
                ? '#5FD08A'
                : isSensorGlow || sensorFlash || flashingSensors?.includes(slot.slotIndex)
                ? '#6FB8D6'
                : '#35383c'
            }
            strokeWidth={
              sensorToneOverride || isSensorGlow || sensorFlash || flashingSensors?.includes(slot.slotIndex)
                ? 2.2
                : 1.2
            }
            className="transition-all duration-300"
            filter={
              sensorToneOverride === 'red'
                ? 'drop-shadow(0 0 6px rgba(239, 107, 107, 0.9))'
                : sensorToneOverride === 'green'
                ? 'drop-shadow(0 0 6px rgba(95, 208, 138, 0.9))'
                : isSensorGlow || sensorFlash || flashingSensors?.includes(slot.slotIndex)
                ? 'drop-shadow(0 0 8px rgba(111, 184, 214, 0.95))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }
          />

          {/* Subtle PCB Inner Highlight Rim */}
          <rect
            x={sensorX + 1}
            y={sensorY + 1}
            width={sensorW - 2}
            height={sensorH - 2}
            rx={3}
            fill="none"
            stroke="rgba(255, 240, 225, 0.08)"
            strokeWidth={0.75}
          />

          {/* Concentric Sonar Acoustic Wave Halos (matching Fig 3 screenshot) */}
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR * 1.55}
            fill="none"
            stroke="#6FB8D6"
            strokeWidth={0.75}
            opacity={0.16}
          />
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR * 1.25}
            fill="none"
            stroke="#6FB8D6"
            strokeWidth={0.75}
            opacity={0.24}
          />

          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR * 1.55}
            fill="none"
            stroke="#6FB8D6"
            strokeWidth={0.75}
            opacity={0.16}
          />
          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR * 1.25}
            fill="none"
            stroke="#6FB8D6"
            strokeWidth={0.75}
            opacity={0.24}
          />

          {/* Left Transducer Cylinder (Transmitter "T") */}
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR}
            fill="#181614"
            stroke="#8A8D91"
            strokeWidth={1}
          />
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR - 0.6}
            fill="none"
            stroke="rgba(255, 240, 225, 0.15)"
            strokeWidth={0.5}
          />
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR * 0.65}
            fill="#0E0C0A"
            stroke="#D2C8BB"
            strokeWidth={0.85}
          />
          <circle
            cx={leftTransducerX}
            cy={transducerY}
            r={transducerR * 0.26}
            fill={sensorToneOverride === 'red' ? '#EF6B6B' : sensorToneOverride === 'green' ? '#5FD08A' : isSensorGlow ? '#6FB8D6' : activeSonar?.tone === 'red' ? '#EF6B6B' : activeSonar?.tone === 'green' ? '#5FD08A' : '#2A2622'}
          />
          <circle
            cx={leftTransducerX}
            cy={transducerY - 0.4}
            r={transducerR * 0.1}
            fill="#FFFFFF"
            opacity={0.6}
          />

          {/* Right Transducer Cylinder (Receiver "R") */}
          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR}
            fill="#181614"
            stroke="#8A8D91"
            strokeWidth={1}
          />
          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR - 0.6}
            fill="none"
            stroke="rgba(255, 240, 225, 0.15)"
            strokeWidth={0.5}
          />
          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR * 0.65}
            fill="#0E0C0A"
            stroke="#D2C8BB"
            strokeWidth={0.85}
          />
          <circle
            cx={rightTransducerX}
            cy={transducerY}
            r={transducerR * 0.26}
            fill={sensorToneOverride === 'red' ? '#EF6B6B' : sensorToneOverride === 'green' ? '#5FD08A' : isSensorGlow ? '#6FB8D6' : activeSonar?.tone === 'red' ? '#EF6B6B' : activeSonar?.tone === 'green' ? '#5FD08A' : '#2A2622'}
          />
          <circle
            cx={rightTransducerX}
            cy={transducerY - 0.4}
            r={transducerR * 0.1}
            fill="#FFFFFF"
            opacity={0.6}
          />

          {/* Silkscreen Label "HC-SR04" */}
          <text
            x={sensorX + sensorW * 0.5}
            y={lane === 0 ? sensorY + sensorH - 1.8 : sensorY + 5.5}
            textAnchor="middle"
            fill="#8A8D91"
            fontSize={5}
            fontWeight="600"
            fontFamily="IBM Plex Mono, monospace"
            letterSpacing="0.03em"
            className="select-none pointer-events-none"
          >
            HC-SR04
          </text>
        </g>

        {/* Distance Readout Bubble */}
        {readout && readout.visible && (
          <motion.g
            id={`slot-readout-S${slotNum}`}
            initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            transform={`translate(${sensorX + sensorW * 0.5 - 24}, ${
              lane === 0 ? sensorY + sensorH + 6 : sensorY - 22
            })`}
            className="pointer-events-none select-none"
          >
            <rect
              x={0}
              y={0}
              width={48}
              height={18}
              rx={9}
              fill="rgba(20, 17, 14, 0.90)"
              stroke={readout.tone === 'green' ? '#5FD08A' : '#EF6B6B'}
              strokeWidth={1.2}
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"
            />
            <text
              x={24}
              y={12.5}
              textAnchor="middle"
              fill={readout.tone === 'green' ? '#5FD08A' : '#EF6B6B'}
              fontSize={10}
              fontFamily="IBM Plex Mono, monospace"
              fontWeight="600"
            >
              {readout.cm} cm
            </text>
          </motion.g>
        )}

        {/* =================================================================== */}
        {/* SLOT NAME (~16px) IN PROPER CORNER (TOP-LEFT LANE 0 / BOTTOM-LEFT LANE 1) */}
        {/* =================================================================== */}
        <g id={`slot-text-row-${slotNum}`}>
          <text
            x={16}
            y={lane === 0 ? 22 : height - 22}
            dominantBaseline="central"
            textAnchor="start"
            fill="#F6F0E8"
            fontSize={16}
            fontWeight="bold"
            fontFamily="Hanken Grotesk, system-ui, sans-serif"
            letterSpacing={0.5}
          >
            S{slotNum}
          </text>
        </g>

        {/* Small "Click to adjust distance" hint shown on hover/focus */}
        <text
          x={width * 0.5}
          y={lane === 0 ? height * 0.77 : height * 0.26}
          textAnchor="middle"
          fill="#D2C8BB"
          fontSize={8.5}
          fontFamily="Hanken Grotesk, system-ui, sans-serif"
          fontWeight="500"
          className="opacity-0 group-hover:opacity-90 group-focus:opacity-90 transition-opacity pointer-events-none"
        >
          Click to adjust distance
        </text>

        {/* =================================================================== */}
        {/* BAY CONTENT: PARKED CAR SPRITE OR VACANT 'P' MARKER                 */}
        {/* =================================================================== */}
        {isOccupied && !hideCarSprite ? (
          /* Parked Car (Reverse-parked, occupying 55% of bay width x 65% of bay height) */
          <motion.g
            id={`occupied-car-S${slotNum}`}
            data-testid={`car-sprite-S${slotNum}`}
            key={`car-occupied-${slot.slotIndex}`}
            initial={
              isArriving && !shouldReduceMotion
                ? {
                  x: carX - 60,
                  y: lane === 0 ? height + 35 : -35,
                  rotate: lane === 0 ? 90 : -90,
                  opacity: 0.8,
                }
                : false
            }
            animate={
              isArriving && !shouldReduceMotion
                ? {
                  x: [
                    carX - 60,
                    carX + 10,
                    carX,
                    carX,
                  ],
                  y: [
                    lane === 0 ? height + 35 : -35,
                    lane === 0 ? height + 15 : -15,
                    lane === 0 ? carY + 4 : carY - 4,
                    carY,
                  ],
                  rotate: [
                    lane === 0 ? 90 : -90,
                    lane === 0 ? 30 : -30,
                    0,
                    0,
                  ],
                  opacity: 1,
                }
                : {
                  x: carX,
                  y: carY,
                  rotate: 0,
                  opacity: 1,
                }
            }
            transition={{
              duration: isArriving && !shouldReduceMotion ? t(1200) / 1000 : 0.2,
              ease: 'easeOut',
            }}
          >
            <CarSvg
              x={0}
              y={0}
              width={carW}
              height={carH}
              color={CAR_COLORS[slot.slotIndex % CAR_COLORS.length]}
              orientation="portrait"
              facing={carFacing}
              isReversing={isArriving}
            />
          </motion.g>
        ) : isLeaving && !shouldReduceMotion ? (
          /* Car leaving animation */
          <motion.g
            key={`car-leaving-${slot.slotIndex}`}
            initial={{
              x: carX,
              y: carY,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: [carX, carX, carX + 30, carX + 70],
              y: [
                carY,
                lane === 0 ? height + 10 : -10,
                lane === 0 ? height + 35 : -35,
                lane === 0 ? height + 35 : -35,
              ],
              rotate: [
                0,
                0,
                lane === 0 ? 45 : -45,
                lane === 0 ? 90 : -90,
              ],
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: t(1200) / 1000,
              ease: 'easeIn',
            }}
          >
            <CarSvg
              x={0}
              y={0}
              width={carW}
              height={carH}
              color={CAR_COLORS[slot.slotIndex % CAR_COLORS.length]}
              orientation="portrait"
              facing={carFacing}
            />
          </motion.g>
        ) : (
          /* Vacant bay 'P' floor marker: circle about 56% of slot width (radius = 28% of slot width) */
          <g
            transform={`translate(${carCenterX}, ${carCenterY})`}
            opacity={0.75}
            className="group-hover:opacity-100 transition-opacity"
            style={{ transitionDuration: `${t(200)}ms` }}
          >
            <circle
              cx={0}
              cy={0}
              r={width * 0.28}
              fill={isTarget ? 'rgba(224, 168, 75, 0.12)' : 'none'}
              stroke={isTarget ? '#E0A84B' : '#8a8d91'}
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={9}
              textAnchor="middle"
              fill={isTarget ? '#E0A84B' : '#d2c8bb'}
              fontSize={26}
              fontWeight="bold"
              fontFamily="Hanken Grotesk, system-ui, sans-serif"
            >
              P
            </text>
            {/* Subtle red strike line across P circle for dimmed candidate slots */}
            {rankBadge?.strikeP && (
              <motion.line
                x1={-width * 0.22}
                y1={-width * 0.22}
                x2={width * 0.22}
                y2={width * 0.22}
                stroke="#EF6B6B"
                strokeWidth={2}
                strokeLinecap="round"
                initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: shouldReduceMotion ? 0 : t(400) / 1000 }}
              />
            )}
          </g>
        )}

        {/* Rank Badge: small glass pill inside slot near P circle */}
        {rankBadge && (
          <motion.g
            id={`rank-badge-S${slotNum}`}
            initial={shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 280 }}
            transform={`translate(${carCenterX - 56}, ${
              lane === 0 ? carCenterY + width * 0.32 : carCenterY - width * 0.32 - 18
            })`}
            className="pointer-events-none select-none"
          >
            <rect
              x={0}
              y={0}
              width={112}
              height={18}
              rx={9}
              fill="rgba(34, 29, 25, 0.92)"
              stroke="rgba(255, 240, 225, 0.22)"
              strokeWidth={1}
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
            />
            <text
              x={56}
              y={12.5}
              textAnchor="middle"
              fill="#D2C8BB"
              fontSize={9.5}
              fontFamily="Hanken Grotesk, system-ui, sans-serif"
              fontWeight="600"
            >
              {rankBadge.text}
            </text>
          </motion.g>
        )}

        {/* =================================================================== */}
        {/* STATUS PILL (AISLE SIDE, CENTRED HORIZONTALLY, 50% WIDTH, 12px)     */}
        {/* =================================================================== */}
        {pillStateOverride !== 'HIDDEN' && (
          <g transform={`translate(${pillX}, ${pillY})`}>
          <motion.g
            key={`pill-anim-${effectiveTarget ? 'target' : effectiveOccupied ? 'occ' : 'vac'}`}
            initial={pillOverride && !shouldReduceMotion ? { rotateX: 90, opacity: 0.5 } : false}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : t(250) / 1000, ease: 'easeOut' }}
            style={{ transformOrigin: `${pillW * 0.5}px ${pillH * 0.5}px` }}
          >
            <rect
              x={0}
              y={0}
              width={pillW}
              height={pillH}
              rx={pillH / 2}
              fill={pillBg}
              stroke={statusBadgeColor}
              strokeWidth={1}
            />
            <text
              x={pillW * 0.20}
              y={12.8}
              textAnchor="middle"
              fill={statusBadgeColor}
              fontSize={9.5}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {effectiveTarget ? '★' : effectiveOccupied ? '✖' : '✔'}
            </text>
            <text
              x={pillW * 0.60}
              y={12.8}
              textAnchor="middle"
              fill={statusBadgeColor}
              fontSize={9.5}
              fontWeight="600"
              fontFamily="Hanken Grotesk, system-ui, sans-serif"
              letterSpacing={0.4}
            >
              {effectiveTarget ? 'TARGET' : effectiveOccupied ? 'OCCUPIED' : 'VACANT'}
            </text>
          </motion.g>
        </g>
        )}
      </g>
    );
  },
);

SlotCard.displayName = 'SlotCard';
