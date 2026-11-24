// ============================================================================
// PARKWAY CLAIM 5 DECISION BOARD OVERLAY (src/features/parking/DecisionBoardOverlay.tsx)
// Renders position tags, scoreboard, tie badge, count-up chip, and formula chip
// in the 1100x590 design coordinate system.
// ============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDecisionBoardStore } from '@/scenarios/fx/decisionBoard';
import { START_X, SLOT_WIDTH } from './lotLayout';

export const DecisionBoardOverlay: React.FC = () => {
  const {
    positionTags,
    scoreboard,
    tieBadge,
    aisleCountChip,
    formulaChip,
  } = useDecisionBoardStore();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* 1. Position Tags in Sensor Bands */}
      <AnimatePresence>
        {Object.entries(positionTags).map(([slotStr, tag]) => {
          const slot = Number(slotStr);
          const col = slot % 4;
          const lane = slot < 4 ? 0 : 1;
          const colX = START_X + col * SLOT_WIDTH;
          const centerX = colX + SLOT_WIDTH / 2;
          // Sensor band: top of bay for lane 0, bottom of bay for lane 1
          const centerY = lane === 0 ? 30 : 560;

          return (
            <motion.div
              key={`pos-tag-${slot}`}
              initial={{ opacity: 0, scale: 0.8, y: lane === 0 ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A1714]/95 border border-gold/50 shadow-glass-g3 z-30"
              style={{ left: centerX, top: centerY }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="text-gold font-mono text-[11px] font-semibold tracking-wider">
                {tag.text}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 2. Step 1 Aisle Count-Up Chip */}
      <AnimatePresence>
        {aisleCountChip && (
          <motion.div
            key="aisle-count-chip"
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-[#1A1714]/95 border border-white/20 shadow-glass-g3 backdrop-blur-md flex items-center gap-3 z-30"
            style={{ left: 609, top: 295 }}
          >
            <div className="flex items-center gap-1.5 text-xs font-ui">
              <span className="w-2 h-2 rounded-full bg-red" />
              <span className="text-text-2">Occupied</span>
              <span className="font-mono font-bold text-red text-sm">
                {aisleCountChip.occ}
              </span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-xs font-ui">
              <span className="w-2 h-2 rounded-full bg-green" />
              <span className="text-text-2">Free</span>
              <span className="font-mono font-bold text-green text-sm">
                {aisleCountChip.free}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Step 2 Formula Chip */}
      <AnimatePresence>
        {formulaChip && (
          <motion.div
            key="decision-formula-chip"
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-[#1A1714]/95 border border-gold/50 shadow-glass-g3 text-gold font-mono text-xs font-semibold tracking-wide z-30 flex items-center gap-2"
            style={{ left: 609, top: 295 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span>{formulaChip}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Step 4 Scoreboard Comparison (S3 vs S6 in aisle) */}
      <AnimatePresence>
        {scoreboard && (
          <motion.div
            key="aisle-scoreboard"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-35 flex flex-col items-center gap-1.5"
            style={{ left: 704, top: 295 }}
          >
            {/* Slot A (S3 - Position 2) */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[14px] bg-[#1A1714]/95 border border-white/20 shadow-glass-g3">
              <span className="font-mono text-gold font-bold text-xs">
                S{scoreboard.slotA + 1}
              </span>
              <span className="text-text-3 text-xs">•</span>
              <span className="font-mono text-text-2 text-xs">
                position {scoreboard.posA}
              </span>
              {scoreboard.fartherSlot === scoreboard.slotA && (
                <span className="px-1.5 py-0.5 rounded-full bg-red/20 border border-red/40 text-red font-mono text-[10px] font-bold">
                  farther
                </span>
              )}
            </div>

            {/* Comparator (<) */}
            {scoreboard.showComparator && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-7 h-7 rounded-full bg-gold/20 border border-gold shadow-[0_0_12px_rgba(224,168,75,0.4)] flex items-center justify-center text-gold font-mono font-bold text-sm"
              >
                &lt;
              </motion.div>
            )}

            {/* Slot B (S6 - Position 1) */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[14px] bg-[#1A1714]/95 border border-white/20 shadow-glass-g3">
              <span className="font-mono text-gold font-bold text-xs">
                S{scoreboard.slotB + 1}
              </span>
              <span className="text-text-3 text-xs">•</span>
              <span className="font-mono text-text-2 text-xs">
                position {scoreboard.posB}
              </span>
              {scoreboard.winnerSlot === scoreboard.slotB && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 border border-gold/50 text-gold font-mono text-[10px] font-bold">
                  👑 WINNER
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Crown above S6 card */}
      <AnimatePresence>
        {scoreboard?.winnerSlot === 5 && (
          <motion.div
            key="winner-crown-s6"
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center"
            style={{ left: 609, top: 380 }}
          >
            <div className="w-9 h-9 rounded-full bg-[#1A1714]/90 border border-gold/60 shadow-[0_0_16px_rgba(224,168,75,0.5)] flex items-center justify-center text-base">
              👑
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Step 6 Tie Badge (between S2 and S6 in column 1) */}
      <AnimatePresence>
        {tieBadge && (
          <motion.div
            key="tie-badge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 14, stiffness: 280 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-[#1A1714]/95 border-2 border-gold shadow-[0_0_24px_rgba(224,168,75,0.6)] flex items-center gap-2.5 z-40"
            style={{ left: 609, top: 295 }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-ping" />
            <span className="text-gold font-ui font-bold text-xs tracking-wide">
              {tieBadge.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
