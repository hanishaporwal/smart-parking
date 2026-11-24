import React from 'react';
import { motion } from 'motion/react';
import { SlotState } from '@/engine';
import { t } from '@/scenarios/pacing';
import {
  ROUTE_GREEN,
  ROUTE_CORE,
  ROUTE_GLOW,
  ROUTE_STROKE_WIDTH,
  ROUTE_DOTTED_DASHARRAY,
  ROUTE_DOTTED_OPACITY,
} from './routeTokens';

export interface NavigationRouteProps {
  slots: SlotState[];
  slotWidth: number;
  slotGap: number;
  startX: number;
  entranceX: number;
  entranceY: number;
  lane0Y: number;
  lane1Y: number;
  targetSlotOverride?: number | null;
  routeOpacity?: number;
}

import { useFxStore } from '@/scenarios/fx';

export const NavigationRoute: React.FC<NavigationRouteProps> = React.memo(
  ({ slots, slotWidth, slotGap, startX, entranceX, entranceY, lane0Y, lane1Y, targetSlotOverride, routeOpacity }) => {
    const deferSweepVisual = useFxStore(s => s.ledVisualState.deferSweepVisual);
    const routeOverride = useFxStore(s => s.routeOverride);

    // If deferSweepVisual is active and no explicit routeOverride is set (and no targetSlotOverride), route is not drawn
    if (deferSweepVisual && !routeOverride?.active && targetSlotOverride === undefined) {
      return null;
    }

    const targets = targetSlotOverride !== undefined
      ? (targetSlotOverride !== null
          ? [
              slots[targetSlotOverride] ?? {
                slotIndex: targetSlotOverride,
                lane: (targetSlotOverride < 4 ? 0 : 1) as 0 | 1,
                positionInLane: (targetSlotOverride % 4) as 0 | 1 | 2 | 3,
                occupied: false,
                distance: 28,
                isTarget: true,
              },
            ]
          : [])
      : routeOverride?.active
      ? [
          slots[routeOverride.targetSlot] ?? {
            slotIndex: routeOverride.targetSlot,
            lane: (routeOverride.lane % 2) as 0 | 1,
            positionInLane: (routeOverride.targetSlot % 4) as 0 | 1 | 2 | 3,
            occupied: false,
            distance: 28,
            isTarget: true,
          },
        ]
      : slots.filter(s => s.isTarget);

    if (targets.length === 0) {
      const allOccupied = slots.every(s => s.occupied);
      return (
        <g id="navigation-no-route-layer">
          {/* Lowered Entry Barrier Arm */}
          <line
            x1={entranceX}
            y1={entranceY - 26}
            x2={entranceX}
            y2={entranceY + 26}
            stroke="#EF6B6B"
            strokeWidth={4}
            strokeDasharray="6 3"
          />
          {/* Barrier Caution Sign */}
          <g transform={`translate(${entranceX + 16}, ${entranceY - 14})`}>
            <rect x={0} y={0} width={175} height={28} rx={6} fill="#1C1815" stroke="#EF6B6B" strokeWidth={1.5} />
            <text x={10} y={18} fill="#c50404ff" fontSize={9.5} fontFamily="Hanken Grotesk, system-ui, sans-serif" fontWeight="600">
              {allOccupied ? '⛔ LOT FULL: ALL BAYS OCCUPIED' : '⚠️ NO TARGET ROUTE ACTIVE'}
            </text>
          </g>
        </g>
      );
    }
    return (
      <motion.g
        id="navigation-routes-layer"
        animate={
          routeOverride?.retracting
            ? { opacity: 0, scaleX: 0 }
            : { opacity: routeOpacity !== undefined ? routeOpacity : 1, scaleX: 1 }
        }
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformOrigin: `${entranceX}px ${entranceY}px` }}
      >
        {targets.map(target => {
          const lane = target.lane;
          const targetPos = target.positionInLane;
          const slotCenterX = startX + targetPos * (slotWidth + slotGap) + slotWidth * 0.5;
          // Exact strip edge: Lane 0 strip bottom edge, Lane 1 strip top edge
          const stripEdgeY = lane === 0 ? lane0Y + 3.5 : lane1Y - 3.5;

          // Road-to-slot turning geometry: car travels down center road strip, then curves smoothly into target slot
          const turnStartX = slotCenterX - 32;
          const branchPathId = `route-branch-${target.slotIndex}`;

          // Directional in-pavement chevron marker pointing into the target bay (road to slot)
          const arrowTipY = lane === 0 ? stripEdgeY - 2 : stripEdgeY + 2;
          const arrowBaseY = lane === 0 ? stripEdgeY + 9 : stripEdgeY - 9;
          const turnEndY = arrowBaseY;

          // Entry straight segment along the center of the road
          const entryD = `M ${entranceX} ${entranceY} L ${turnStartX} ${entranceY}`;

          // Smooth vehicular turn-in curve terminating cleanly at the base of the arrow
          const turnD = `C ${slotCenterX - 14} ${entranceY}, ${slotCenterX} ${lane === 0 ? entranceY - 24 : entranceY + 24}, ${slotCenterX} ${turnEndY}`;

          // Continuous master path for channel and comet tracking: stops cleanly at arrow base
          const fullPathD = `${entryD} ${turnD}`;

          const primaryChevronD =
            lane === 0
              ? `M ${slotCenterX - 6} ${arrowBaseY} L ${slotCenterX} ${arrowTipY} L ${slotCenterX + 6} ${arrowBaseY}`
              : `M ${slotCenterX - 6} ${arrowBaseY} L ${slotCenterX} ${arrowTipY} L ${slotCenterX + 6} ${arrowBaseY}`;

          const secondaryChevronD =
            lane === 0
              ? `M ${slotCenterX - 4.5} ${arrowBaseY + 6} L ${slotCenterX} ${arrowTipY + 6} L ${slotCenterX + 4.5} ${arrowBaseY + 6}`
              : `M ${slotCenterX - 4.5} ${arrowBaseY - 6} L ${slotCenterX} ${arrowTipY - 6} L ${slotCenterX + 4.5} ${arrowBaseY - 6}`;

          return (
            <g key={target.slotIndex} id={`route-target-${target.slotIndex}`}>
              {/* Invisible master path for in-channel motion tracking */}
              <path id={branchPathId} d={fullPathD} fill="none" stroke="transparent" />

              {/* ------------------------------------------------------------- */}
              {/* 1. RECESSED IN-GROUND ASPHALT CHANNEL (Physical Road Bed)     */}
              {/* ------------------------------------------------------------- */}
              <g id={`channel-bed-${target.slotIndex}`} className="pointer-events-none">
                {/* Precision saw-cut groove into the tarmac */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#16181b"
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Inner dark trough of the embedded channel */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#0c0d0f"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* 2. SOFT NATURAL LIGHT DIFFUSION ON ASPHALT (Subtle Ambient)   */}
              {/* ------------------------------------------------------------- */}
              <g id={`light-diffusion-${target.slotIndex}`} className="pointer-events-none">
                {/* Very gentle ambient green light spill on adjacent asphalt */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="rgba(0, 255, 0, 0.12)"
                  strokeWidth={7.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Concentrated near-lens diffusion */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="rgba(0, 255, 0, 0.22)"
                  strokeWidth={4.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* 3. SOLID ACTIVE GUIDANCE: ENTRY ZONE SEGMENT (Blinking Dashes) */}
              {/* ------------------------------------------------------------- */}
              <g id={`entry-leds-${target.slotIndex}`}>
                <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                {/* Luminous emerald dashed guidance line along middle road strip */}
                <path
                  d={entryD}
                  fill="none"
                  stroke={ROUTE_GREEN}
                  strokeWidth={ROUTE_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  strokeLinejoin="round"
                  filter={`drop-shadow(0 0 4px ${ROUTE_GLOW})`}
                />
                {/* High-intensity optical core */}
                <path
                  d={entryD}
                  fill="none"
                  stroke={ROUTE_CORE}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* 4. LANE SEGMENTS (Pass-Over Dotted vs Solid Active Guidance)  */}
              {/* ------------------------------------------------------------- */}
              {Array.from({ length: targetPos + 1 }).map((_, pos) => {
                const curSlotIdx = lane * 4 + pos;
                const curSlot = slots[curSlotIdx];
                const segStartX = pos === 0 ? entranceX : startX + pos * (slotWidth + slotGap) - 32;
                const segEndX =
                  pos === targetPos
                    ? turnStartX
                    : startX + (pos + 1) * (slotWidth + slotGap) - 32;

                if (!curSlot) return null;

                // Pass-over segment past intermediate occupied slot: dotted round-stud guidance
                if (curSlot.occupied && pos < targetPos) {
                  return (
                    <g key={pos} id={`pass-over-leds-${pos}`}>
                      <line
                        x1={segStartX}
                        y1={entranceY}
                        x2={segEndX}
                        y2={entranceY}
                        stroke={ROUTE_GREEN}
                        strokeWidth={ROUTE_STROKE_WIDTH}
                        strokeLinecap="round"
                        strokeDasharray={ROUTE_DOTTED_DASHARRAY}
                        opacity={ROUTE_DOTTED_OPACITY}
                        filter={`drop-shadow(0 0 2px ${ROUTE_GLOW})`}
                      />
                    </g>
                  );
                }

                // Active vacant / target lane segment: clearly brighter dashed blinking guidance
                return (
                  <g key={pos} id={`active-leds-${pos}`}>
                    <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                    {/* Emerald diode body */}
                    <line
                      x1={segStartX}
                      y1={entranceY}
                      x2={segEndX}
                      y2={entranceY}
                      stroke={ROUTE_GREEN}
                      strokeWidth={ROUTE_STROKE_WIDTH}
                      strokeLinecap="round"
                      strokeDasharray="8 4"
                      filter={`drop-shadow(0 0 4px ${ROUTE_GLOW})`}
                    />
                    {/* Intense optical diode core */}
                    <line
                      x1={segStartX}
                      y1={entranceY}
                      x2={segEndX}
                      y2={entranceY}
                      stroke={ROUTE_CORE}
                      strokeWidth={1.2}
                      strokeLinecap="round"
                      strokeDasharray="8 4"
                      opacity={0.95}
                    />
                  </g>
                );
              })}

              {/* ------------------------------------------------------------- */}
              {/* 5. TURN-IN SEGMENT INTO TARGET BAY (Smooth Road to Slot)      */}
              {/* ------------------------------------------------------------- */}
              <g id={`turn-in-leds-${target.slotIndex}`}>
                <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                <path
                  d={`M ${turnStartX} ${entranceY} ${turnD}`}
                  fill="none"
                  stroke={ROUTE_GREEN}
                  strokeWidth={ROUTE_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  filter={`drop-shadow(0 0 4px ${ROUTE_GLOW})`}
                />
                <path
                  d={`M ${turnStartX} ${entranceY} ${turnD}`}
                  fill="none"
                  stroke={ROUTE_CORE}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  opacity={0.95}
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* 6. DIRECTIONAL TURN-IN CHEVRONS (Road to Slot)                */}
              {/* ------------------------------------------------------------- */}
              <g id={`target-chevron-marker-${target.slotIndex}`}>
                <animate attributeName="opacity" values="1;0.45;1" dur="0.8s" repeatCount="indefinite" />
                {/* Primary embedded LED chevron: recessed cut */}
                <path
                  d={primaryChevronD}
                  fill="none"
                  stroke="#16181b"
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Primary chevron soft diffusion */}
                <path
                  d={primaryChevronD}
                  fill="none"
                  stroke="rgba(0, 255, 0, 0.25)"
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Primary chevron diode */}
                <path
                  d={primaryChevronD}
                  fill="none"
                  stroke={ROUTE_GREEN}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`drop-shadow(0 0 4px ${ROUTE_GLOW})`}
                />
                {/* Primary chevron optical core */}
                <path
                  d={primaryChevronD}
                  fill="none"
                  stroke={ROUTE_CORE}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />

                {/* Secondary trailing subtle chevron */}
                <path
                  d={secondaryChevronD}
                  fill="none"
                  stroke={ROUTE_GREEN}
                  strokeWidth={2.0}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.75}
                />
              </g>


              {/* ------------------------------------------------------------- */}
              {/* 7. IN-CHANNEL SEQUENTIAL LIGHT PULSE (Low-Profile Ripple)     */}
              {/* ------------------------------------------------------------- */}
              <g id={`in-channel-pulse-${target.slotIndex}`}>
                <g>
                  <animateMotion
                    dur={`${(t(2400) / 1000).toFixed(2)}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href={`#${branchPathId}`} />
                  </animateMotion>
                  {/* Soft ambient green light aura */}
                  <circle
                    r={7}
                    fill="rgba(0, 255, 0, 0.40)"
                    className="motion-safe:animate-pulse"
                  />
                  {/* Luminous emerald comet outer ring */}
                  <circle
                    r={4.2}
                    fill="#00FF00"
                    stroke="#00FF00"
                    strokeWidth={1}
                    filter="drop-shadow(0 0 6px rgba(0, 255, 0, 0.95))"
                  />
                  {/* Intense bright white diamond core */}
                  <circle
                    r={2.2}
                    fill="#FFFFFF"
                  />
                </g>
              </g>
            </g>
          );
        })}
      </motion.g>
    );
  },
);

NavigationRoute.displayName = 'NavigationRoute';
