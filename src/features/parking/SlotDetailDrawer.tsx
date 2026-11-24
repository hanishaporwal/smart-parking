import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Car, ArrowUpRight } from 'lucide-react';
import { useSimStore } from '@/store';
import { calculatePopoverPosition } from './popoverPosition';

export const SlotDetailDrawer: React.FC = () => {
  const {
    state,
    selectedSlotIndex,
    slotPopoverAnchor,
    setSelectedSlotIndex,
    setDistance,
  } = useSimStore();

  const [popoverDimensions, setPopoverDimensions] = useState({ width: 220, height: 78 });

  const closeTimerRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isPointerOutsideRef = useRef(false);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const shouldReduceMotion = useReducedMotion();
  const isOpen = selectedSlotIndex !== null;
  const slot = selectedSlotIndex !== null ? state.slots[selectedSlotIndex] : null;

  // Measure popover dimensions dynamically to keep positioning accurate
  useLayoutEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (
          Math.abs(rect.width - popoverDimensions.width) > 4 ||
          Math.abs(rect.height - popoverDimensions.height) > 4
        ) {
          setPopoverDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    }
  }, [selectedSlotIndex, popoverDimensions.width, popoverDimensions.height]);

  // Calculate anchor point
  const effectiveAnchor = useMemo(() => {
    if (slotPopoverAnchor) return slotPopoverAnchor;
    if (selectedSlotIndex !== null && typeof document !== 'undefined') {
      const el = document.querySelector(`[aria-label*="Parking Slot S${selectedSlotIndex + 1}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
        };
      }
    }
    return { x: 300, y: 250 };
  }, [slotPopoverAnchor, selectedSlotIndex]);

  // Calculate coordinates so cursor is inside popover and fits within viewport
  const coords = useMemo(() => {
    const vW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vH = typeof window !== 'undefined' ? window.innerHeight : 800;
    return calculatePopoverPosition(
      effectiveAnchor,
      popoverDimensions.width,
      popoverDimensions.height,
      vW,
      vH,
    );
  }, [effectiveAnchor, popoverDimensions]);

  // Cancel any pending close timer
  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Close the popover and restore keyboard focus to the slot element
  const closePopover = useCallback(() => {
    cancelClose();
    setSelectedSlotIndex(null);
    if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
      lastActiveElementRef.current.focus();
    }
  }, [cancelClose, setSelectedSlotIndex]);

  // Pointer leaves the popover -> start 150ms delay (unless actively dragging slider)
  const handlePointerLeave = useCallback(() => {
    isPointerOutsideRef.current = true;
    if (isDraggingRef.current) {
      // Keep open while dragging
      return;
    }
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      closePopover();
    }, 150);
  }, [cancelClose, closePopover]);

  // Pointer enters or moves within the popover -> cancel pending close timer
  const handlePointerEnter = useCallback(() => {
    isPointerOutsideRef.current = false;
    cancelClose();
  }, [cancelClose]);

  // Global pointer up listener to stop dragging state
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // If cursor was outside when releasing, start close countdown
        if (isPointerOutsideRef.current) {
          cancelClose();
          closeTimerRef.current = window.setTimeout(() => {
            closePopover();
          }, 150);
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [cancelClose, closePopover]);

  // Keyboard accessibility: Escape closes, Enter or Space on slot opens
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePopover();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePopover]);

  // Keyboard focus leaves popover -> close
  const handleFocusOut = (e: React.FocusEvent<HTMLDivElement>) => {
    if (popoverRef.current && e.relatedTarget && !popoverRef.current.contains(e.relatedTarget as Node)) {
      closePopover();
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!slot || selectedSlotIndex === null) {
    return null;
  }

  const slotNum = slot.slotIndex + 1;
  const cutoffPct = ((15 - 2) / (50 - 2)) * 100; // 27.08%
  const currentPct = Math.max(0, Math.min(100, ((slot.distance - 2) / (50 - 2)) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`slot-popover-${slot.slotIndex}`}
          ref={popoverRef}
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onBlur={handleFocusOut}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0, transition: { duration: 0.12 } }
              : { opacity: 0, scale: 0.95, transition: { duration: 0.12, ease: 'easeIn' } }
          }
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            top: `${coords.top}px`,
            zIndex: 50,
          }}
          className="w-[230px] glass-g3-float glass-refract-strong shadow-glass-g3 rounded-[22px] p-3 text-text select-none focus:outline-none"
          role="dialog"
          aria-modal="false"
          aria-label={`Slot S${slotNum}`}
          tabIndex={-1}
        >
          {/* Row 1: Slot identifier + Quick Park/Vacate buttons + Distance in cm */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  slot.occupied ? 'bg-red shadow-glass-occupied-glow' : 'bg-green shadow-glass-route-glow'
                }`}
                aria-hidden="true"
              />
              <span className="font-data font-medium text-sm text-text leading-none">
                S{slotNum}
              </span>
            </div>

            {/* Quick action buttons: Park (8 cm) & Vacate (28 cm) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setDistance(slot.slotIndex, 8)}
                disabled={slot.occupied}
                title="Park car (8 cm)"
                aria-label="Park car (8 cm)"
                className={`h-[26px] px-2.5 flex items-center justify-center rounded-[7px] border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-gold active:scale-[0.96] ${
                  slot.occupied
                    ? 'opacity-40 cursor-not-allowed border-white/[0.08] bg-white/[0.04] text-text-3 pointer-events-none'
                    : 'border-red/80 bg-red/25 text-red hover:bg-red/35 hover:border-red shadow-[0_0_10px_rgba(239,107,107,0.35)] cursor-pointer'
                }`}
              >
                <Car className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <button
                type="button"
                onClick={() => setDistance(slot.slotIndex, 28)}
                disabled={!slot.occupied}
                title="Vacate slot (28 cm)"
                aria-label="Vacate slot (28 cm)"
                className={`h-[26px] px-2.5 flex items-center justify-center rounded-[7px] border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-gold active:scale-[0.96] ${
                  !slot.occupied
                    ? 'opacity-40 cursor-not-allowed border-white/[0.08] bg-white/[0.04] text-text-3 pointer-events-none'
                    : 'border-green/80 bg-green/25 text-green hover:bg-green/35 hover:border-green shadow-[0_0_10px_rgba(95,208,138,0.35)] cursor-pointer'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            <span className="font-data text-xs tabular-nums text-text-2 shrink-0 text-right">
              <span className={slot.occupied ? 'text-red font-medium' : 'text-green font-medium'}>
                {slot.distance}
              </span>{' '}
              <span className="font-ui text-text-3">cm</span>
            </span>
          </div>

          {/* Label: Distance Adjustment */}
          <div
            id={`slider-label-s${slotNum}`}
            className="text-left font-ui text-caption text-text-3 select-none mb-1.5 leading-none"
          >
            Distance adjustment
          </div>

          {/* Row 2: Live Slider (2-50 cm) with tiny tick at 15cm cutoff */}
          <div
            className="relative flex items-center w-full"
            onPointerDownCapture={e => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.closest('input[type="range"]')) {
                isDraggingRef.current = true;
              }
            }}
          >
            <input
              type="range"
              min={2}
              max={50}
              step={1}
              value={slot.distance}
              onChange={e => setDistance(slot.slotIndex, Number(e.target.value))}
              aria-labelledby={`slider-label-s${slotNum}`}
              aria-label="Distance Adjustment"
              className="w-full h-1.5 rounded-pill appearance-none cursor-pointer border border-border-recessed glass-recessed shadow-inner focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
              style={{
                background: `linear-gradient(to right, ${
                  slot.occupied ? '#EF6B6B' : '#5FD08A'
                } 0%, ${
                  slot.occupied ? '#EF6B6B' : '#5FD08A'
                } ${currentPct}%, #100E0C ${currentPct}%, #100E0C 100%)`,
              }}
            />
            {/* Tiny tick at the 15 cm cutoff */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-gold pointer-events-none rounded-pill shadow-glass-gold-glow"
              style={{ left: `${cutoffPct}%` }}
              title="15 cm threshold"
              aria-hidden="true"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SlotDetailPopover = SlotDetailDrawer;
