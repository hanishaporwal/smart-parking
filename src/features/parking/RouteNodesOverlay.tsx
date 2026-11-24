// ============================================================================
// PARKWAY CLAIM 12 ROUTE NODES OVERLAY (src/features/parking/RouteNodesOverlay.tsx)
// Renders the 6 planned route guidance nodes along the aisle centre line,
// pulsing/ignited states, trail fading, and the "No app. No screen." badge.
// ============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouteNodesStore } from '@/scenarios/fx/routeNodes';

export const RouteNodesOverlay: React.FC = () => {
  const { visible, nodes, noAppBadgeVisible, tieChip } = useRouteNodesStore();

  if (!visible && !noAppBadgeVisible && !tieChip) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* 1. Planned Route Guidance Nodes */}
      {nodes.map((node) => {
        if (node.state === 'off') return null;

        const isDim = node.state === 'dim';
        const isIgnited = node.state === 'ignited';
        const isTrailFaded = node.state === 'trailFaded';
        const isPulsing = node.state === 'pulsing';

        const opacity = isTrailFaded ? 0.15 : isDim ? 0.5 : 1;

        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-opacity duration-600"
            style={{ left: node.x, top: node.y, opacity }}
          >
            {/* Ping pulse ring on ignition or continuous pulse */}
            {(isIgnited || isPulsing) && (
              <span
                className={`absolute w-8 h-8 rounded-full bg-[#00FF00]/40 pointer-events-none ${
                  isPulsing ? 'animate-ping' : 'animate-ping duration-1000'
                }`}
              />
            )}

            {/* Glowing circular node */}
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDim
                  ? 'border border-[#00FF00]/60 bg-[#00FF00]/10 shadow-[0_0_6px_rgba(0,255,0,0.25)]'
                  : 'bg-[#00FF00] shadow-[0_0_14px_rgba(0,255,0,0.95)] border border-white/60'
              }`}
            >
              {!isDim && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              )}
            </div>

            {/* Monospace Node Label ("Entrance", "L1", "L2", "L3", "L4", "S7") */}
            <span
              className={`mt-1.5 font-mono text-[10px] tracking-wider transition-colors duration-300 ${
                isDim
                  ? 'text-[#A99F92]'
                  : 'text-[#00FF00] font-bold drop-shadow-[0_0_6px_rgba(0,255,0,0.8)]'
              }`}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* 2. "No app. No screen." Badge (ground.topLeft) */}
      <AnimatePresence>
        {noAppBadgeVisible && (
          <motion.div
            key="claim12-no-app-badge"
            initial={{ opacity: 0, scale: 0.88, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute left-6 top-6 px-4 py-2.5 rounded-[18px] bg-[#1A1714]/95 border border-gold/60 shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_16px_rgba(224,168,75,0.3)] backdrop-blur-md flex items-center gap-3 z-40"
          >
            {/* Phone outline with animated red diagonal slash */}
            <div className="relative w-5 h-7 border-2 border-gold rounded-[4px] flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-gold absolute bottom-0.5" />
              {/* Red slash */}
              <motion.line
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                className="absolute inset-0"
              >
                <svg className="w-full h-full overflow-visible">
                  <line
                    x1="-2"
                    y1="-2"
                    x2="22"
                    y2="30"
                    stroke="#EF6B6B"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </svg>
              </motion.line>
            </div>

            {/* Typography */}
            <div className="flex flex-col">
              <span className="text-text-1 font-ui font-semibold text-xs tracking-tight">
                No app. No screen.
              </span>
              <span className="text-gold font-mono text-[10.5px]">
                Follow the lights
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Step 6 Tie Chip ("Tie at position 3") */}
      <AnimatePresence>
        {tieChip && (
          <motion.div
            key="claim12-tie-chip"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 14, stiffness: 280 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-[#1A1714]/95 border-2 border-gold shadow-[0_0_24px_rgba(224,168,75,0.6)] flex items-center gap-2.5 z-40"
            style={{ left: 609, top: 295 }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-ping" />
            <span className="text-gold font-ui font-bold text-xs tracking-wide">
              {tieChip.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
