import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  LayoutDashboard,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Cpu,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ParkWayLogo } from '@/components/brand';
import { useSimStore } from '@/store';



const SENSOR_LAB_STORAGE_KEY = 'sensor_lab_sidebar_open';

interface SidebarSensorInputProps {
  slotIndex: number;
  currentDistance: number;
  onApply: (slotIndex: number, cm: number) => void;
}

const SidebarSensorInput: React.FC<SidebarSensorInputProps> = ({
  slotIndex,
  currentDistance,
  onApply,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState(String(currentDistance));
  const justFocusedRef = useRef(false);
  const isEscapedRef = useRef(false);

  // Sync with store unless currently being edited
  useEffect(() => {
    if (!isFocused) {
      setTextValue(String(currentDistance));
    }
  }, [currentDistance, isFocused]);

  const commitValue = () => {
    const raw = textValue.trim();
    if (raw === '') {
      setTextValue(String(currentDistance));
      return;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setTextValue(String(currentDistance));
      return;
    }
    const clamped = Math.max(2, Math.min(400, parsed));
    setTextValue(String(clamped));
    onApply(slotIndex, clamped);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    justFocusedRef.current = true;
    setTextValue(String(currentDistance));
    e.currentTarget.select();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (justFocusedRef.current) {
      justFocusedRef.current = false;
      e.currentTarget.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setTextValue(digitsOnly);
  };

  const handleBlur = () => {
    setIsFocused(false);
    justFocusedRef.current = false;
    if (isEscapedRef.current) {
      isEscapedRef.current = false;
      setTextValue(String(currentDistance));
      return;
    }
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isEscapedRef.current = true;
      setTextValue(String(currentDistance));
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const current = parseInt(textValue, 10) || currentDistance;
      const next = Math.min(400, current + step);
      setTextValue(String(next));
      onApply(slotIndex, next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const current = parseInt(textValue, 10) || currentDistance;
      const next = Math.max(2, current - step);
      setTextValue(String(next));
      onApply(slotIndex, next);
    }
  };

  const isOccupied = currentDistance < 15;

  return (
    <label
      htmlFor={`sidebar-slot-distance-s${slotIndex + 1}`}
      className={clsx(
        'group flex items-center justify-between px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer select-none',
        'glass-recessed glass-input-focus hover:border-white/[0.14]',
        isFocused && 'ring-1 ring-gold/40'
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
            isOccupied ? 'bg-red shadow-[0_0_4px_rgba(239,107,107,0.7)]' : 'bg-green/70'
          )}
          title={isOccupied ? 'Occupied (<15cm)' : 'Vacant (≥15cm)'}
        />
        <span
          onClick={() => {
            const el = document.getElementById(
              `sidebar-slot-distance-s${slotIndex + 1}`
            ) as HTMLInputElement | null;
            if (el) {
              el.focus();
              el.select();
            }
          }}
          className="font-data text-[11px] font-semibold tracking-tight text-text-3 group-hover:text-text-1 transition-colors select-none"
        >
          S{slotIndex + 1}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <input
          id={`sidebar-slot-distance-s${slotIndex + 1}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={textValue}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={`S${slotIndex + 1} distance in centimetres`}
          className="w-8 px-0.5 text-right font-data tabular-nums text-xs font-semibold text-text-1 bg-transparent border-0 focus:outline-none cursor-text"
        />
        <span className="text-[10px] font-data text-text-3/80 select-none">
          cm
        </span>
      </div>
    </label>
  );
};

export interface SidebarProps {
  className?: string;
  onNavClick?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onExpandAndOpenSensorLab?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className,
  onNavClick,
  isMobile = false,
  isCollapsed = false,
  onExpandAndOpenSensorLab,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const { state, setDistance } = useSimStore();
  const { slots } = state;

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sensor lab collapsible state in expanded mode
  const [isSensorLabOpen, setIsSensorLabOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SENSOR_LAB_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SENSOR_LAB_STORAGE_KEY, String(isSensorLabOpen));
    } catch {
      // ignore
    }
  }, [isSensorLabOpen]);

  // Track width animation transition to manage overflow
  useEffect(() => {
    if (isMobile) return;
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 180);
    return () => clearTimeout(timer);
  }, [isCollapsed, isMobile]);

  const toggleSensorLab = () => {
    setIsSensorLabOpen(prev => !prev);
  };

  const effectiveCollapsed = !isMobile && isCollapsed;

  return (
    <aside
      className={clsx(
        'h-full glass-g1 lg:rounded-r-card rounded-none flex flex-col justify-between select-none relative',
        isMobile
          ? 'w-full'
          : effectiveCollapsed
            ? 'w-[72px]'
            : 'w-[280px]',
        isTransitioning ? 'overflow-hidden' : effectiveCollapsed ? 'overflow-visible' : 'overflow-hidden',
        className
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header / Brand Block - Clean dark charcoal with crisp divider */}
        <div
          className={clsx(
            'border-b border-white/[0.06] glass-header-band-gold shrink-0 transition-all duration-200',
            effectiveCollapsed ? 'py-5 px-3.5 flex justify-center' : 'py-5 px-4 flex flex-col items-center justify-center'
          )}
        >
          {effectiveCollapsed ? (
            /* Collapsed Rail Header: Centered 44px Logo with tooltip 'ParkWay' */
            <NavLink
              to="/"
              onClick={onNavClick}
              aria-label="ParkWay home"
              className="relative group flex items-center justify-center w-11 h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-transform duration-150 hover:-translate-y-px"
            >
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <ParkWayLogo
                  size={44}
                  variant="tile"
                  className="shrink-0"
                />
              </motion.div>
              <span
                role="tooltip"
                className="!absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
              >
                ParkWay
              </span>
            </NavLink>
          ) : (
            /* Expanded Header: Centered Logo + Wordmark Below + Tagline */
            <NavLink
              to="/"
              onClick={onNavClick}
              aria-label="ParkWay home"
              className="group flex flex-col items-center justify-center text-center w-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-transform duration-150 hover:-translate-y-px"
            >
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <ParkWayLogo
                  size={58}
                  variant="tile"
                  className="shrink-0 drop-shadow-md"
                />
              </motion.div>
              <div className="flex flex-col items-center text-center mt-2.5 w-full overflow-hidden">
                <div className="font-display font-semibold text-[25px] leading-tight tracking-[-0.02em] whitespace-nowrap">
                  <span className="text-[#F6F0E8]">Park</span>
                  <span className="text-gold">Way</span>
                </div>
                <div
                  className="text-[12px] font-ui text-[#A99F92] leading-tight mt-1 max-w-[220px]"
                  title="Follow the light to the nearest free slot"
                >
                  Follow the light to the nearest free slot
                </div>
              </div>
            </NavLink>
          )}
        </div>

        {/* Navigation List */}
        <nav
          id="sidebar-navigation"
          aria-label="Sidebar navigation"
          className={clsx(
            'flex-1 p-3 space-y-2 overflow-y-auto',
            effectiveCollapsed ? 'px-2 overflow-visible' : ''
          )}
        >
          {effectiveCollapsed ? (
            /* ==============================================================
               COLLAPSED RAIL: Sleek 44px circular/squircle buttons with tooltips
               ============================================================== */
            <div className="flex flex-col items-center space-y-2.5 pt-2 w-full">
              {/* Overview icon button */}
              <div className="relative group flex justify-center w-11 h-11 shrink-0">
                <NavLink
                  to="/"
                  onClick={onNavClick}
                  aria-label="Overview"
                  className={({ isActive }) =>
                    clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none active:scale-[0.96]',
                      isActive
                        ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-[0_0_12px_rgba(169,139,107,0.3)]'
                        : 'bg-white/[0.02] border border-white/[0.05] text-[#8a8d91] hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-[#F6F0E8]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <LayoutDashboard className="w-5 h-5" />
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold absolute bottom-1.5 shadow-[0_0_6px_rgba(169,139,107,0.8)]" />
                      )}
                    </>
                  )}
                </NavLink>
                <span
                  role="tooltip"
                  className="!absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  Overview
                </span>
              </div>

              {/* Guidance & Hardware icon button */}
              <div className="relative group flex justify-center w-11 h-11 shrink-0">
                <NavLink
                  to="/guidance-hardware"
                  onClick={onNavClick}
                  aria-label="Guidance & Hardware"
                  className={({ isActive }) =>
                    clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none active:scale-[0.96]',
                      isActive
                        ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-[0_0_12px_rgba(169,139,107,0.3)]'
                        : 'bg-white/[0.02] border border-white/[0.05] text-[#8a8d91] hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-[#F6F0E8]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Cpu className="w-5 h-5" />
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold absolute bottom-1.5 shadow-[0_0_6px_rgba(169,139,107,0.8)]" />
                      )}
                    </>
                  )}
                </NavLink>
                <span
                  role="tooltip"
                  className="!absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  Guidance & Hardware
                </span>
              </div>

              {/* Patent Claims icon button */}
              <div className="relative group flex justify-center w-11 h-11 shrink-0">
                <NavLink
                  to="/claims"
                  onClick={onNavClick}
                  aria-label="Patent Claims"
                  className={({ isActive }) =>
                    clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none active:scale-[0.96]',
                      isActive
                        ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-[0_0_12px_rgba(169,139,107,0.3)]'
                        : 'bg-white/[0.02] border border-white/[0.05] text-[#8a8d91] hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-[#F6F0E8]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <FileCheck2 className="w-5 h-5" />
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold absolute bottom-1.5 shadow-[0_0_6px_rgba(169,139,107,0.8)]" />
                      )}
                    </>
                  )}
                </NavLink>
                <span
                  role="tooltip"
                  className="!absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  Patent Claims
                </span>
              </div>

              {/* Analytics icon button */}
              <div className="relative group flex justify-center w-11 h-11 shrink-0">
                <NavLink
                  to="/analytics"
                  onClick={onNavClick}
                  aria-label="Analytics"
                  className={({ isActive }) =>
                    clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none active:scale-[0.96]',
                      isActive
                        ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold font-semibold shadow-[0_0_12px_rgba(169,139,107,0.3)]'
                        : 'bg-white/[0.02] border border-white/[0.05] text-[#8a8d91] hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-[#F6F0E8]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold absolute bottom-1.5 shadow-[0_0_6px_rgba(169,139,107,0.8)]" />
                      )}
                    </>
                  )}
                </NavLink>
                <span
                  role="tooltip"
                  className="!absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  Analytics
                </span>
              </div>

              {/* Sensor Lab icon button (expands sidebar and opens Sensor Lab) */}
              <div className="relative group flex justify-center w-11 h-11 shrink-0">
                <button
                  id="sidebar-sensor-lab-rail-toggle"
                  type="button"
                  onClick={() => {
                    setIsSensorLabOpen(true);
                    onExpandAndOpenSensorLab?.();
                  }}
                  aria-label="Sensor Lab (expands sidebar)"
                  className={clsx(
                    'w-11 h-11 rounded-full flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none active:scale-[0.96]',
                    isSensorLabOpen
                      ? 'bg-white/[0.06] border border-white/[0.14] text-text-1 font-semibold'
                      : 'bg-white/[0.02] border border-white/[0.05] text-[#8a8d91] hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-[#F6F0E8]'
                  )}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  {isSensorLabOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold absolute bottom-1.5 shadow-[0_0_6px_rgba(169,139,107,0.8)]" />
                  )}
                </button>
                <span
                  role="tooltip"
                  className="!absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill glass-g3-float glass-tooltip text-text-1 font-ui text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                >
                  Sensor Lab
                </span>
              </div>
            </div>
          ) : (
            /* ==============================================================
               EXPANDED / MOBILE FULL NAVIGATION
               ============================================================== */
            <>
              {/* Overview NavLink */}
              <NavLink
                to="/"
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between p-1.5 pl-2 pr-4 rounded-full font-ui text-[14px] transition-all duration-200 group min-h-[50px] active:scale-[0.98]',
                    isActive
                      ? 'bg-[#1E1B18]/90 border border-[#A98B6B]/40 text-[#F6F0E8] font-semibold shadow-[0_0_18px_rgba(169,139,107,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.025] border border-white/[0.06] text-[#C4BCB3] hover:bg-white/[0.05] hover:border-white/[0.10] hover:text-[#F6F0E8]'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                          isActive
                            ? 'bg-[#C4A482] text-[#1C1814] shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'bg-[#201D1A] border border-white/[0.08] text-[#8E867E] group-hover:text-[#F6F0E8] shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                        )}
                      >
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Overview</span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#C4A482] shrink-0 shadow-[0_0_8px_rgba(196,164,130,0.9)]" />
                    )}
                  </div>
                )}
              </NavLink>

              {/* Guidance & Hardware link */}
              <NavLink
                to="/guidance-hardware"
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between p-1.5 pl-2 pr-3.5 rounded-full font-ui text-[14px] transition-all duration-200 group min-h-[50px] active:scale-[0.98]',
                    isActive
                      ? 'bg-[#1E1B18]/90 border border-[#A98B6B]/40 text-[#F6F0E8] font-semibold shadow-[0_0_18px_rgba(169,139,107,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.025] border border-white/[0.06] text-[#C4BCB3] hover:bg-white/[0.05] hover:border-white/[0.10] hover:text-[#F6F0E8]'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div
                        className={clsx(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                          isActive
                            ? 'bg-[#C4A482] text-[#1C1814] shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'bg-[#201D1A] border border-white/[0.08] text-[#8E867E] group-hover:text-[#F6F0E8] shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                        )}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>
                      <span className="font-medium truncate">Guidance & Hardw...</span>
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#C4A482] shrink-0 shadow-[0_0_8px_rgba(196,164,130,0.9)]" />
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#181615] border border-white/[0.08] text-[11px] font-mono text-[#8E867E]">
                        WS2812
                      </span>
                    )}
                  </div>
                )}
              </NavLink>

              {/* Patent Claims NavLink */}
              <NavLink
                to="/claims"
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between p-1.5 pl-2 pr-3.5 rounded-full font-ui text-[14px] transition-all duration-200 group min-h-[50px] active:scale-[0.98]',
                    isActive
                      ? 'bg-[#1E1B18]/90 border border-[#A98B6B]/40 text-[#F6F0E8] font-semibold shadow-[0_0_18px_rgba(169,139,107,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.025] border border-white/[0.06] text-[#C4BCB3] hover:bg-white/[0.05] hover:border-white/[0.10] hover:text-[#F6F0E8]'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                          isActive
                            ? 'bg-[#C4A482] text-[#1C1814] shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'bg-[#201D1A] border border-white/[0.08] text-[#8E867E] group-hover:text-[#F6F0E8] shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                        )}
                      >
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Patent Claims</span>
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#C4A482] shrink-0 shadow-[0_0_8px_rgba(196,164,130,0.9)]" />
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#181615] border border-white/[0.08] text-[11px] font-mono text-[#8E867E]">
                        Full View
                      </span>
                    )}
                  </div>
                )}
              </NavLink>

              {/* Analytics NavLink */}
              <NavLink
                to="/analytics"
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between p-1.5 pl-2 pr-3.5 rounded-full font-ui text-[14px] transition-all duration-200 group min-h-[50px] active:scale-[0.98]',
                    isActive
                      ? 'bg-[#1E1B18]/90 border border-[#A98B6B]/40 text-[#F6F0E8] font-semibold shadow-[0_0_18px_rgba(169,139,107,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.025] border border-white/[0.06] text-[#C4BCB3] hover:bg-white/[0.05] hover:border-white/[0.10] hover:text-[#F6F0E8]'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                          isActive
                            ? 'bg-[#C4A482] text-[#1C1814] shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'bg-[#201D1A] border border-white/[0.08] text-[#8E867E] group-hover:text-[#F6F0E8] shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                        )}
                      >
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <span className="font-medium">Analytics</span>
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#C4A482] shrink-0 shadow-[0_0_8px_rgba(196,164,130,0.9)]" />
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#181615] border border-white/[0.08] text-[11px] font-mono text-[#8E867E]">
                        Live Lot
                      </span>
                    )}
                  </div>
                )}
              </NavLink>

              {/* Sensor Lab Toggle Button & Collapsible Panel */}
              <div>
                <button
                  id="sidebar-sensor-lab-toggle"
                  type="button"
                  onClick={toggleSensorLab}
                  aria-expanded={isSensorLabOpen}
                  aria-controls="sidebar-sensor-lab-panel"
                  className={clsx(
                    'w-full flex items-center justify-between p-1.5 pl-2 pr-4 rounded-full font-ui text-[14px] transition-all duration-200 focus-visible:outline-none group min-h-[50px] active:scale-[0.98]',
                    isSensorLabOpen
                      ? 'bg-white/[0.05] border border-white/[0.12] text-[#F6F0E8]'
                      : 'bg-white/[0.025] border border-white/[0.06] text-[#C4BCB3] hover:bg-white/[0.05] hover:border-white/[0.10] hover:text-[#F6F0E8]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                        isSensorLabOpen
                          ? 'bg-[#2A2622] border border-white/[0.14] text-text-1 shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : 'bg-[#201D1A] border border-white/[0.08] text-[#8E867E] group-hover:text-[#F6F0E8] shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]'
                      )}
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Sensor Lab</span>
                  </div>
                  <ChevronDown
                    className={clsx(
                      'w-4.5 h-4.5 text-[#8E867E] transition-transform duration-200 group-hover:text-[#F6F0E8]',
                      isSensorLabOpen && 'rotate-180 text-[#C4BCB3]'
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Collapsible Sensor Lab Panel - Integrated sleek dark bay */}
                <AnimatePresence initial={false}>
                  {isSensorLabOpen && (
                    <motion.div
                      id="sidebar-sensor-lab-panel"
                      key="sensor-lab-panel"
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-1 px-1">
                        <div className="p-2.5 rounded-inner-card glass-g2 space-y-2">
                          <div className="flex items-center justify-between px-1 select-none">
                            <span className="text-[10px] font-ui font-semibold uppercase tracking-[0.08em] text-text-3">
                              Distance (cm)
                            </span>
                            <span className="text-[10px] font-data text-text-3/60">
                              2–400 cm
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1.5">
                              {[0, 1, 2, 3].map(idx => (
                                <SidebarSensorInput
                                  key={idx}
                                  slotIndex={idx}
                                  currentDistance={slots[idx]?.distance ?? 25}
                                  onApply={setDistance}
                                />
                              ))}
                            </div>
                            <div className="space-y-1.5">
                              {[4, 5, 6, 7].map(idx => (
                                <SidebarSensorInput
                                  key={idx}
                                  slotIndex={idx}
                                  currentDistance={slots[idx]?.distance ?? 25}
                                  onApply={setDistance}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Footer Specs Card (Hidden in collapsed mode) - Sleek telemetry module */}
      {!effectiveCollapsed && (
        <div className="p-3.5 border-t border-white/[0.06] shrink-0 transition-opacity duration-200">
          <div className="p-3 rounded-inner-card glass-g2 font-ui text-xs space-y-2">
            <div className="flex items-center justify-between text-text-1 font-semibold text-[11.5px]">
              <span>Hardware Specs</span>
              <Sparkles className="w-3.5 h-3.5 text-gold/80 shrink-0" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 font-medium">Topology:</span>
                <span className="text-text-2 font-data tabular-nums">2 Lanes / 8 Slots</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 font-medium">LED Strips:</span>
                <span className="text-text-2 font-data tabular-nums">2 × 100px WS2812</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 font-medium">Sensors:</span>
                <span className="text-text-2 font-data tabular-nums">8 × HC-SR04</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 font-medium">Sampling:</span>
                <span className="text-gold font-medium font-data tabular-nums">~100ms Loop</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

