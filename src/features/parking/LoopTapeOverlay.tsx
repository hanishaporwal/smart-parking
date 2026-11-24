// ============================================================================
// PARKWAY CLAIM 7 SENSOR LOOP TAPE OVERLAY (src/features/parking/LoopTapeOverlay.tsx)
// Renders the glass sensor loop tape in ground.bottomLeft and Plan A / Plan B
// route chips at slot bay entrances.
// ============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLoopTapeStore } from '@/scenarios/fx/loopTape';
import { START_X, SLOT_WIDTH } from './lotLayout';

export const LoopTapeOverlay: React.FC = () => {
  const {
    visible,
    blindMs,
    takenMark,
    seenMark,
    planChips,
  } = useLoopTapeStore();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* 1. Plan A / Plan B Chips at Route Terminus */}
      <AnimatePresence>
        {planChips.map((chip) => {
          const col = chip.slot % 4;
          const colX = START_X + col * SLOT_WIDTH;
          const centerX = colX + SLOT_WIDTH / 2;
          const centerY = 224; // Upper lane aisle boundary in front of bay

          const isCancelled = chip.status === 'cancelled';

          return (
            <motion.div
              key={chip.name}
              initial={{ opacity: 0, scale: 0.85, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-glass-g3 z-35 ${
                isCancelled
                  ? 'bg-[#2A1717]/95 border border-red/60 text-red shadow-[0_0_12px_rgba(239,107,107,0.3)]'
                  : 'bg-[#1A1714]/95 border border-gold/70 text-gold shadow-[0_0_12px_rgba(224,168,75,0.3)]'
              }`}
              style={{ left: centerX, top: centerY }}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCancelled ? 'bg-red' : 'bg-gold animate-pulse'
                }`}
              />
              <span
                className={`font-mono text-xs font-bold ${
                  isCancelled ? 'line-through opacity-85' : ''
                }`}
              >
                {chip.name}: S{chip.slot + 1}
              </span>
              {isCancelled && (
                <span className="px-1.5 py-0.2 rounded-full bg-red/20 text-red font-mono text-[9px] font-bold">
                  CANCELLED
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 2. Glass Sensor Loop Tape (in ground.bottomLeft) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="claim7-loop-tape"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute left-4 top-[405px] w-[285px] rounded-[18px] bg-[#1A1714]/95 border border-info/40 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_16px_rgba(111,184,214,0.2)] backdrop-blur-md p-3 z-35"
          >
            {/* Header: Title and Ticking Info */}
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-info animate-pulse" />
                <h5 className="font-ui font-semibold text-text-1 text-xs tracking-tight">
                  Sensor Loop Tape
                </h5>
              </div>
              <span className="text-info font-mono text-[10px] font-semibold">
                100 ms cycle
              </span>
            </div>

            {/* Scrolling Track Container */}
            <div className="relative h-11 w-full rounded-[8px] bg-[#100E0C] border border-[#2E2823] overflow-hidden flex items-center px-1">
              {/* Repeating 100 ms "sense" cycle ticks */}
              <div className="absolute inset-0 flex items-center justify-around px-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 opacity-60">
                    <span className="w-0.5 h-3 bg-info/70" />
                    <span className="text-info font-mono text-[8px]">sense</span>
                  </div>
                ))}
              </div>

              {/* Hatched Blind Sweep Block (when blindMs active) */}
              {blindMs && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 140 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-8 h-8 rounded-[4px] border border-white/20 flex items-center justify-center overflow-hidden z-10"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, rgba(70,62,55,0.7) 0px, rgba(70,62,55,0.7) 4px, rgba(34,30,26,0.7) 4px, rgba(34,30,26,0.7) 8px)',
                  }}
                >
                  <span className="text-[#D2C8BB] font-mono text-[9px] font-bold px-1.5 text-center leading-tight drop-shadow-sm">
                    Sweep: blind {blindMs} ms
                  </span>
                </motion.div>
              )}

              {/* Red Taken Event Marker */}
              {takenMark && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-16 top-1 px-1.5 py-0.5 rounded-full bg-red/20 border border-red text-red font-mono text-[9px] font-bold z-20 shadow-sm"
                >
                  TAKEN
                </motion.div>
              )}

              {/* Green Seen Event Marker */}
              {seenMark?.visible && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-2 bottom-1 px-2 py-0.5 rounded-full bg-green/20 border border-green text-green font-mono text-[9.5px] font-bold z-20 shadow-sm flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green" />
                  {seenMark.text}
                </motion.div>
              )}

              {/* Fixed Right Edge "NOW" Cursor */}
              <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-info shadow-[0_0_8px_rgba(111,184,214,0.9)] flex items-start justify-center z-15">
                <span className="text-[7.5px] font-mono font-bold text-info bg-[#1A1714] px-0.5 rounded-sm -mt-0.5 border border-info/50">
                  NOW
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
