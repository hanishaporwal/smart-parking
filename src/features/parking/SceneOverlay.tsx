// ============================================================================
// PARKWAY SCENE OVERLAY (src/features/parking/SceneOverlay.tsx)
// Renders SVG shapes (spotlight scrim mask, leader lines, pulse rings) and
// HTML glass chips (pins, callouts, panels, chips, recap) in 1100x590 lot space.
// ============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDirectorStore } from '@/scenarios/director/store';
import { LOT_DESIGN_WIDTH, LOT_DESIGN_HEIGHT } from './lotLayout';
import { InspectorPanel } from './InspectorPanel';
import { DecisionBoardOverlay } from './DecisionBoardOverlay';
import { RouteNodesOverlay } from './RouteNodesOverlay';
import { LoopTapeOverlay } from './LoopTapeOverlay';

export interface SceneOverlayProps {
  scale: number;
}

export const SceneOverlay: React.FC<SceneOverlayProps> = ({ scale }) => {
  const { pins, callouts, spotlight, panels, chips, recap, mismatchWarning } = useDirectorStore();

  return (
    <div
      id="scene-director-overlay"
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden"
      style={{
        width: Math.round(LOT_DESIGN_WIDTH * scale),
        height: Math.round(LOT_DESIGN_HEIGHT * scale),
      }}
    >
      {/* 1. SVG Layer for Spotlight Scrim & Leader Lines */}
      <svg
        viewBox={`0 0 ${LOT_DESIGN_WIDTH} ${LOT_DESIGN_HEIGHT}`}
        className="absolute inset-0 w-full h-full block pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {spotlight && spotlight.rects.length > 0 && (
            <mask id="scene-spotlight-mask">
              {/* White background: scrim is visible */}
              <rect x="0" y="0" width={LOT_DESIGN_WIDTH} height={LOT_DESIGN_HEIGHT} fill="#ffffff" />
              {/* Black cutouts: holes in scrim for the spotlighted anchors with 12px soft radius */}
              {spotlight.rects.map((r, i) => (
                <rect
                  key={i}
                  x={r.x - 6}
                  y={r.y - 6}
                  width={r.width + 12}
                  height={r.height + 12}
                  rx={12}
                  ry={12}
                  fill="#000000"
                />
              ))}
            </mask>
          )}
        </defs>

        {/* 62% Black Scrim Mask with 300ms fade */}
        <AnimatePresence>
          {spotlight && spotlight.rects.length > 0 && (
            <motion.rect
              key="spotlight-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              x="0"
              y="0"
              width={LOT_DESIGN_WIDTH}
              height={LOT_DESIGN_HEIGHT}
              fill="rgba(0, 0, 0, 0.62)"
              mask="url(#scene-spotlight-mask)"
            />
          )}
        </AnimatePresence>

        {/* Callout Leader Lines connecting chip to anchor target */}
        {callouts.map((c) => {
          const { x, y, width, height, targetX, targetY } = c.placement;
          // Determine the origin point on the callout chip closest to the target
          const chipCenterX = x + width / 2;
          const chipCenterY = y + height / 2;

          let startX = chipCenterX;
          let startY = chipCenterY;

          if (targetY < y) {
            startY = y; // target is above chip
            startX = Math.max(x + 16, Math.min(x + width - 16, targetX));
          } else if (targetY > y + height) {
            startY = y + height; // target is below chip
            startX = Math.max(x + 16, Math.min(x + width - 16, targetX));
          } else if (targetX < x) {
            startX = x; // target is left of chip
            startY = Math.max(y + 10, Math.min(y + height - 10, targetY));
          } else {
            startX = x + width; // target is right of chip
            startY = Math.max(y + 10, Math.min(y + height - 10, targetY));
          }

          return (
            <g key={`leader-${c.id}`}>
              <line
                x1={startX}
                y1={startY}
                x2={targetX}
                y2={targetY}
                stroke="#E0A84B"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.8}
              />
              <circle cx={targetX} cy={targetY} r={3.5} fill="#E0A84B" />
            </g>
          );
        })}
      </svg>

      {/* 2. HTML Layer for Glass Chips, Pins & Panels (CSS scaled to match design coords) */}
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{
          width: LOT_DESIGN_WIDTH,
          height: LOT_DESIGN_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {/* S3 Detailed Internal Inspector Panel */}
        <InspectorPanel />

        {/* Claim 5 Decision Board Overlay */}
        <DecisionBoardOverlay />

        {/* Claim 12 Route Nodes Overlay */}
        <RouteNodesOverlay />

        {/* Claim 7 Loop Tape Overlay */}
        <LoopTapeOverlay />

        {/* Numbered Pins */}
        {pins.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: p.x, top: p.y }}
          >
            {/* Pulse Ring */}
            <span className="absolute w-10 h-10 rounded-full bg-gold/30 animate-ping pointer-events-none" />
            <div className="w-7 h-7 rounded-full bg-gold text-[#0E0C0A] font-data font-bold text-xs flex items-center justify-center shadow-glass-g3 border border-white/30 z-10">
              {p.n}
            </div>
          </div>
        ))}

        {/* Callout Glass Chips */}
        <AnimatePresence>
          {callouts.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute pointer-events-auto"
              style={{
                left: c.placement.x,
                top: c.placement.y,
                width: c.placement.width,
              }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-[16px] bg-[#1E1A16]/90 border border-gold/40 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_0_12px_rgba(224,168,75,0.2)] backdrop-blur-[16px]">
                {/* Step Pin Number */}
                <span className="w-6 h-6 rounded-full bg-gold text-[#0E0C0A] text-[11px] font-data font-bold flex items-center justify-center shrink-0 shadow-sm">
                  {c.n}
                </span>
                {/* Callout Text */}
                <span className="text-[13.5px] font-ui text-text-1 font-medium leading-tight line-clamp-2">
                  {c.text}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Interactive Panels */}
        {panels.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="absolute rounded-[24px] bg-[#1A1714]/92 border border-white/[0.14] shadow-glass-g3 backdrop-blur-[20px] p-4 text-text-1"
            style={{
              left: p.rect.x,
              top: p.rect.y,
              width: p.rect.width,
              height: p.rect.height,
            }}
          >
            <h4 className="text-sm font-display font-medium text-gold mb-1">{p.title}</h4>
          </motion.div>
        ))}

        {/* Small Glass Chips */}
        {chips.map((ch) => (
          <div
            key={ch.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill bg-[#1E1A16]/90 border border-white/20 text-text-1 text-xs font-ui shadow-glass-g3"
            style={{ left: ch.x, top: ch.y }}
          >
            {ch.text}
          </div>
        ))}

        {/* Step 6 Claim Recap Card (ground.topLeft) */}
        <AnimatePresence>
          {recap && (
            <motion.div
              key="claim-recap-chip"
              initial={{ opacity: 0, y: -8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.94 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute left-6 top-6 w-[260px] rounded-[20px] bg-[#1A1714]/94 border border-gold/50 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_16px_rgba(224,168,75,0.25)] backdrop-blur-[20px] p-3.5 z-40 pointer-events-auto"
            >
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/[0.08]">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                <h4 className="text-[14px] font-display font-medium text-gold">{recap.title}</h4>
              </div>
              <ul className="space-y-1.5 text-[12px] font-ui text-text-2">
                {recap.facts.map((fact, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-gold font-bold shrink-0">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Development-Only Expect Mismatch Warning */}
        {mismatchWarning && (
          <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-red/20 border border-red/60 text-red text-xs font-mono shadow-lg backdrop-blur-md z-50">
            [DEV ASSERTION] {mismatchWarning.message}
          </div>
        )}
      </div>
    </div>
  );
};
