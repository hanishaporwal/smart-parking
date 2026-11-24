import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useSimStore } from '@/store';
import { useScenarioStore } from '@/scenarios';
import { useFxStore } from '@/scenarios/fx';
import { t } from '@/scenarios/pacing';
import { Badge } from '@/components/Badge';
import { SlotCard } from './SlotCard';
import { LedStripSvg } from './LedStripSvg';
import { NavigationRoute } from './NavigationRoute';
import { CarSvg } from './CarSvg';
import { SceneOverlay } from './SceneOverlay';
import { registerAnchorElement } from '@/scenarios/anchors';

export interface TopDownParkingLotProps {
  className?: string;
}

export const TopDownParkingLot: React.FC<TopDownParkingLotProps> = ({ className = '' }) => {
  const { state, selectedSlotIndex, setSelectedSlotIndex } = useSimStore();
  const {
    currentClaim,
    currentScenario,
    status,
    currentStepIndex,
    activeCaption,
    highlightSubsystem,
    currentVisualHint,
    togglePlayPause,
    restart,
    closeScenario,
    jumpToStep,
    positionLabelsVisible,
    dashboardChipVisible,
    gateCarState,
    barrierArmRaised,
    noAppBadgeVisible,
  } = useScenarioStore();
  const fxScanState = useFxStore(s => s.scanState);
  const fxChips = useFxStore(s => s.chips);
  const fxDashboardCard = useFxStore(s => s.dashboardCard);
  const fxPositionRuler = useFxStore(s => s.positionRulerState);
  const fxMeasureArrow = useFxStore(s => s.measureArrowState);
  const fxDriverCar = useFxStore(s => s.driverCarState);
  const fxIntruderCar = useFxStore(s => s.intruderCarState);
  const fxPhoneBadge = useFxStore(s => s.phoneBadgeState);
  const fxPathGhost = useFxStore(s => s.pathGhostState);
  const fxBarrier = useFxStore(s => s.barrierState);
  const shouldReduceMotion = useReducedMotion();

  const boothLightColor =
    fxBarrier?.lightColor === 'amber'
      ? '#E0A84B'
      : fxBarrier?.lightColor === 'green'
      ? '#5FD08A'
      : '#EF6B6B';

  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isIdle = !currentScenario || status === 'idle';

  const totalSteps = currentClaim ? currentClaim.steps.length : (currentScenario?.steps.length ?? 0);

  // Ref for header element to observe height changes and scale lot
  const headerRef = useRef<HTMLDivElement>(null);

  const handleBarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeScenario();
    } else if (e.key === ' ' || e.code === 'Space') {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        e.preventDefault();
        togglePlayPause();
      }
    }
  };

  const handleSlotClick = (
    slotIndex: number,
    e?: React.MouseEvent<SVGGElement> | React.KeyboardEvent<SVGGElement>,
  ) => {
    let anchor: { x: number; y: number } | null = null;
    if (
      e &&
      'clientX' in e &&
      typeof e.clientX === 'number' &&
      typeof e.clientY === 'number' &&
      (e.clientX !== 0 || e.clientY !== 0)
    ) {
      anchor = { x: e.clientX, y: e.clientY };
    } else if (
      e &&
      e.currentTarget &&
      typeof (e.currentTarget as Element).getBoundingClientRect === 'function'
    ) {
      const rect = (e.currentTarget as Element).getBoundingClientRect();
      anchor = {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    }
    setSelectedSlotIndex(slotIndex, anchor);
  };

  // Dynamic scaling and responsive fit for the fixed design canvas (1100 x 624 design units)
  const lotBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const designWidth = 1100;
  const designHeight = 590;

  const entryZoneWidth = 324; // Freed width from closing slot gaps given to entry column
  const slotWidth = 190; // 190 x 232 (standard parking bay aspect ratio matching reference photo)
  const slotHeight = 232;
  const slotGap = 0; // 0px gap between slots: contiguous parking bays sharing single divider lines
  const startX = entryZoneWidth; // 324: slot area spans 324..1084 (760px)
  const totalStripWidth = slotWidth * 4; // 760px (1084 right edge preserved)

  const upperRowY = 0;
  const lane0LedY = 232;
  const aisleHeight = 126; // Driving aisle
  const entranceY = lane0LedY + Math.round(aisleHeight / 2); // 295 (aisle centre line)
  const lane1LedY = lane0LedY + aisleHeight; // 358
  const lowerRowY = lane1LedY; // 358: Exactly touches Strip 2 (ends at 358 + 232 = 590)
  const gateExitX = 222; // Starts immediately after barrier arm at x = 209

  useEffect(() => {
    const updateScale = () => {
      if (!lotBoxRef.current) return;
      const boxRect = lotBoxRef.current.getBoundingClientRect();
      const rawWidth = boxRect.width;
      if (rawWidth <= 0) return;

      // Compute available inner dimensions subtracting container padding
      const style = window.getComputedStyle(lotBoxRef.current);
      const padX = parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0');
      const padY = parseFloat(style.paddingTop || '0') + parseFloat(style.paddingBottom || '0');

      const boxWidth = Math.max(300, rawWidth - padX);

      // Available viewport height without vertical scrolling inside the box
      const vh = window.innerHeight || 800;
      const currentHeaderH = headerRef.current?.offsetHeight || 64;
      const availableHeight = Math.max(340, vh - currentHeaderH - 48 - padY);

      const scaleX = boxWidth / designWidth;
      const scaleY = availableHeight / designHeight;
      const newScale = Math.min(scaleX, scaleY);
      setScale(Number(newScale.toFixed(4)));
    };

    updateScale();

    const ro = new ResizeObserver(() => updateScale());
    if (lotBoxRef.current) ro.observe(lotBoxRef.current);
    if (headerRef.current) ro.observe(headerRef.current);

    registerAnchorElement(lotBoxRef.current);

    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      registerAnchorElement(null);
      window.removeEventListener('resize', updateScale);
    };
  }, [isIdle, currentStepIndex]);


  return (
    <div
      id="digital-twin-container"
      style={{ scrollMarginTop: '16px' }}
      className={`w-full rounded-[28px] overflow-hidden bg-gradient-to-b from-[#18181A]/92 via-[#121214]/94 to-[#0C0C0E]/98 backdrop-blur-[24px] border ${highlightSubsystem === 'route' || highlightSubsystem === 'sensors'
        ? 'border-gold shadow-[0_0_36px_rgba(169,139,107,0.3)] ring-1 ring-gold/50'
        : 'border-white/[0.08]'
        } shadow-[0_24px_64px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] transition-all duration-300 relative scroll-mt-4 ${className}`}
    >
      {/* Ambient atmospheric depth lighting behind glass */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gold/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-green/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      {/* Header Block with neutral crisp divider */}
      <div
        ref={headerRef}
        className="w-full rounded-t-[28px] border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent relative z-10 transition-all overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isIdle ? (
            /* 1) Title Row: Visible ONLY when idle */
            <motion.div
              key="twin-title-row"
              initial={shouldReduceMotion ? false : { opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={shouldReduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: shouldReduceMotion ? 0 : t(250) / 1000, ease: 'easeOut' }}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 min-h-[64px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full glass-g3 glass-tint-green glass-rim-green text-green flex items-center justify-center shrink-0 shadow-glass-g3">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-display font-medium text-text-1">
                      Digital Twin Layout
                    </h3>
                    <span className="text-xs font-mono font-medium text-gold/90 px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/30 shadow-sm">
                      8 Slot HC-SR04 Mesh
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-2 font-ui mt-0.5">
                    Real-time physical twin with addressable visual guidance paths
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Badge variant="green" size="sm" className="gap-1.5 shadow-glass-g3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                  SIMULATED
                </Badge>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[12px] font-mono text-text-2 glass-g2 border border-white/[0.08] shadow-glass-g3">
                  <span className="w-2 h-2 rounded-full bg-gold/80" />
                  2 × WS2812 • 8 × HC-SR04
                </span>
              </div>
            </motion.div>
          ) : (
            /* 2) Live Claim Section: REPLACES heading when scenario is playing/active */
            <motion.div
              id="live-claim-step-bar"
              key="twin-live-section"
              tabIndex={0}
              role="region"
              aria-label="Live claim step bar"
              onKeyDown={handleBarKeyDown}
              initial={shouldReduceMotion ? false : { opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={shouldReduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: shouldReduceMotion ? 0 : t(250) / 1000, ease: 'easeOut' }}
              className="px-6 py-3 space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {/* That Claim Box: A unified glass-g3 floating card enclosing title, step progress, controls, AND the active step text */}
              <div className="p-3 sm:px-4 sm:py-3 rounded-[24px] glass-g3-float glass-refract border border-white/[0.08] shadow-glass-g3 space-y-2.5">
                {/* Row 1: Floating Capsule top header with Title & Step Counter, Progress Track, Controls */}
                <div className="flex items-center justify-between gap-3 min-w-0 flex-wrap">
                  {/* Left: Status Dot & Claim Title with Step Counter */}
                  <div className="flex items-center gap-2.5 shrink-0 min-w-0">
                    {isPlaying ? (
                      <span className="flex h-3 w-3 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 motion-reduce:hidden" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gold" />
                      </span>
                    ) : isPaused ? (
                      <span className="flex h-3 w-3 relative shrink-0">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gold" />
                      </span>
                    ) : (
                      <span className="flex h-3 w-3 relative shrink-0">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green" />
                      </span>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] sm:text-[15px] font-ui font-semibold text-text truncate max-w-[220px] sm:max-w-[320px] lg:max-w-none">
                        Claim {currentClaim ? currentClaim.number : currentScenario?.claimNumber} - {currentClaim ? currentClaim.title : currentScenario?.title.replace(/^Patent Claim \d+:\s*/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Track (Clickable nodes, 26px circles, 13px numbers) */}
                  <div className="flex-1 min-w-0 max-w-[240px] xl:max-w-md mx-2 hidden md:block overflow-hidden">
                    <div className="flex items-center w-full gap-1 sm:gap-1.5">
                      {currentScenario?.steps.map((st, idx) => {
                        const isPast = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <React.Fragment key={idx}>
                            <button
                              type="button"
                              disabled={!isPaused}
                              onClick={() => isPaused && jumpToStep(idx)}
                              aria-label={`Step ${idx + 1}: ${st.caption}${isPaused ? ' (click to jump)' : ''}`}
                              title={isPaused ? `Jump to Step ${idx + 1}` : `Step ${idx + 1}`}
                              className={`relative flex items-center justify-center w-[26px] h-[26px] rounded-full text-[13px] font-data font-semibold transition-all shrink-0 active:scale-[0.96] ${isPast
                                ? 'bg-gold text-[#0E0C0A] shadow-glass-g3 cursor-default'
                                : isCurrent
                                  ? 'glass-g3 glass-tint-gold text-gold ring-2 ring-gold motion-safe:animate-pulse cursor-default'
                                  : 'glass-g3 text-text-3 border border-border-3 shadow-glass-g3 cursor-default'
                                } ${isPaused ? 'hover:scale-110 cursor-pointer' : ''}`}
                            >
                              {isPast ? (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </button>

                            {idx < totalSteps - 1 && (
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden glass-recessed border border-border-recessed shadow-inner min-w-[6px]">
                                <div
                                  className={`h-full transition-all ${idx < currentStepIndex ? 'bg-gold w-full shadow-glass-gold-glow progress-sheen' : 'bg-transparent w-0'
                                    }`}
                                  style={{ transitionDuration: `${t(300)}ms` }}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Controls (36px height, 14px text, 16px icons) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      id="live-claim-play-pause-button"
                      onClick={togglePlayPause}
                      disabled={isCompleted}
                      aria-label={
                        isPlaying
                          ? 'Pause scenario'
                          : isPaused
                            ? 'Resume scenario'
                            : 'Play scenario'
                      }
                      aria-pressed={isPlaying}
                      className={`flex items-center gap-1.5 h-9 px-3.5 rounded-pill text-[14px] font-ui font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.96] ${isCompleted
                        ? 'opacity-40 cursor-not-allowed pointer-events-none glass-g3 text-text-3 border border-border-3/50'
                        : 'glass-g3 glass-tint-gold hover:scale-[1.02] text-gold border border-gold/60 shadow-glass-g3 cursor-pointer'
                        }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span className="hidden sm:inline">Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span className="hidden sm:inline">Play</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="live-claim-replay-button"
                      onClick={restart}
                      aria-label="Replay scenario"
                      className="flex items-center gap-1.5 h-9 px-3.5 rounded-pill glass-g3 glass-tint-gold hover:scale-[1.02] active:scale-[0.96] text-gold border border-gold/60 shadow-glass-g3 text-[14px] font-ui font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Replay</span>
                    </button>

                    <button
                      type="button"
                      id="live-claim-close-button"
                      onClick={closeScenario}
                      aria-label="Close claim scenario"
                      className="flex items-center justify-center w-9 h-9 rounded-full glass-g3 hover:scale-[1.08] active:scale-[0.96] text-text-3 hover:text-text border border-border-3 shadow-glass-g3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer shrink-0 ml-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Steps Details Area: Embedded cleanly INSIDE the claim box */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentStepIndex}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -3 }}
                      transition={{ duration: shouldReduceMotion ? 0 : t(220) / 1000, ease: 'easeOut' }}
                      className="space-y-1"
                    >
                      {/* Row 2: Number badge and the step caption (large, 22px) */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          id="live-step-badge"
                          data-testid="live-step-badge"
                          className="w-[28px] h-[28px] rounded-full bg-gold text-[#0E0C0A] text-[13px] font-data font-bold flex items-center justify-center shrink-0 shadow-glass-g3"
                        >
                          {currentStepIndex + 1}
                        </span>
                        <h4 className="text-[22px] font-ui font-semibold text-text-1 leading-snug line-clamp-2">
                          {activeCaption}
                        </h4>
                      </div>

                      {/* Row 3: "What you should see:" hint */}
                      {currentVisualHint && (
                        <p className="text-[13.5px] font-ui text-text-2 max-w-full pl-[38px] leading-relaxed">
                          <span className="text-gold/90 font-medium">What you should see: </span>
                          {currentVisualHint}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lot Area Container: Padded wrapper with subtle dark asphalt recessed mat */}
      <div
        ref={lotBoxRef}
        className="w-full relative rounded-b-[28px] p-3 sm:p-5 md:p-6 overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-[#141210]/50 via-transparent to-[#0E0C0A]/60"
        style={{
          minHeight: Math.round(designHeight * scale) + 40,
        }}
      >
        <div
          id="digital-twin-lot-grid"
          style={{
            width: Math.round(designWidth * scale),
            height: Math.round(designHeight * scale),
          }}
          className="relative block select-none shrink-0 rounded-[22px] overflow-hidden border border-white/[0.12] ring-1 ring-black/80 shadow-[inset_0_4px_28px_rgba(0,0,0,0.9),0_14px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Top specular highlight on the lot frame */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-20" />

          {/* Technical Corner Alignment Brackets */}
          <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-white/25 rounded-tl pointer-events-none z-20" />
          <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-white/25 rounded-tr pointer-events-none z-20" />
          <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-white/25 rounded-bl pointer-events-none z-20" />
          <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-white/25 rounded-br pointer-events-none z-20" />
          <svg
            viewBox={`0 0 ${designWidth} ${designHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full block select-none"
          >
            <defs>
              {/* Subtle Speckle Texture Pattern (3-8% opacity, no images) */}
              <pattern id="lot-speckle" width="24" height="24" patternUnits="userSpaceOnUse">
                <rect width="24" height="24" fill="none" />
                <circle cx="4" cy="5" r="0.75" fill="#FFFFFF" opacity="0.06" />
                <circle cx="16" cy="11" r="0.65" fill="#000000" opacity="0.08" />
                <circle cx="8" cy="19" r="0.7" fill="#FFFFFF" opacity="0.05" />
                <circle cx="20" cy="21" r="0.8" fill="#000000" opacity="0.07" />
              </pattern>

              {/* Fine Grain Noise Filter: feTurbulence baseFrequency 0.9, 2 octaves */}
              <filter id="ground-noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.07 0" />
              </filter>

              {/* Large Ground Patches Blur Filter */}
              <filter id="ground-patch-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="16" />
              </filter>

              {/* Hazard Band Diagonal Stripes Pattern: yellow #E8C53A and near-black #14110F, 45 degree, 4px width */}
              <pattern id="hazard-band-pattern" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="4" height="8" fill="#E8C53A" />
                <rect x="4" width="4" height="8" fill="#14110F" />
              </pattern>

              {/* Red and White Diagonal Stripes for Barrier Arm */}
              <pattern id="barrier-stripes" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="5" height="10" fill="#FFFFFF" />
                <rect x="5" width="5" height="10" fill="#DC2626" />
              </pattern>

              {/* Headlight Projection Beam Gradient for Claim 7 Driver Car */}
              <linearGradient id="headlight-beam-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
                <stop offset="35%" stopColor="#BAE6FD" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>

              {/* Defined route trajectory to S7 for Claim 12 vehicle arrival */}
              {(() => {
                const s7CenterX = startX + 2 * (slotWidth + slotGap) + Math.round(slotWidth * 0.5);
                const laneOffset = Math.round(aisleHeight * 0.25);
                const s7RouteY = entranceY + laneOffset;
                return (
                  <path
                    id="route-to-s7"
                    d={`M ${gateExitX} ${entranceY} C ${gateExitX + 12} ${entranceY}, ${gateExitX + 12} ${s7RouteY}, ${gateExitX + 24} ${s7RouteY} L ${s7CenterX} ${s7RouteY} L ${s7CenterX} ${lowerRowY}`}
                    fill="none"
                  />
                );
              })()}

              {/* Thermoplastic Road-Paint Texture Filter for Authentic Weathered Stencil Markings */}
              <filter id="road-paint-texture" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" result="paintNoise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0.15" result="paintRoughness" />
                <feComposite in="SourceGraphic" in2="paintRoughness" operator="in" />
              </filter>

              {/* Translucent Scan Band Gradient */}
              <linearGradient id="scan-band-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6FB8D6" stopOpacity="0" />
                <stop offset="50%" stopColor="#6FB8D6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#6FB8D6" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            {/* ================================================================= */}
            {/* 1. GREY GROUND, ROAD, WHEEL-TRACKS & KERBS LAYER                  */}
            {/* ================================================================= */}
            <g id="ground-and-road-layer">
              {/* Photorealistic Asphalt Ground & Parking Bays (converted from reference photo) */}
              <image
                id="realistic-asphalt-ground"
                href="/realistic-asphalt-layout.webp"
                x={0}
                y={0}
                width={designWidth}
                height={designHeight}
                preserveAspectRatio="none"
              />



              {/* =============================================================== */}
              {/* ACCURATE UI-RENDERED OFF-WHITE ROAD & PARKING BAY MARKING LINES */}
              {/* =============================================================== */}
              <g id="ui-parking-bay-lines" className="pointer-events-none select-none">
                <g filter="url(#road-paint-texture)" opacity={0.95}>
                  {/* Top Road Kerb Line */}
                  <line
                    x1={0}
                    y1={lane0LedY}
                    x2={startX + totalStripWidth}
                    y2={lane0LedY}
                    stroke="#ECE7DF"
                    strokeWidth={3.5}
                    strokeLinecap="square"
                  />
                  {/* Bottom Road Kerb Line */}
                  <line
                    x1={0}
                    y1={lane1LedY}
                    x2={startX + totalStripWidth}
                    y2={lane1LedY}
                    stroke="#ECE7DF"
                    strokeWidth={3.5}
                    strokeLinecap="square"
                  />

                  {/* Top Boundary Line across upper slots S1-S4 */}
                  <line
                    x1={startX}
                    y1={1}
                    x2={startX + totalStripWidth}
                    y2={1}
                    stroke="#ECE7DF"
                    strokeWidth={3.5}
                    strokeLinecap="square"
                  />
                  {/* Bottom Boundary Line across lower slots S5-S8 */}
                  <line
                    x1={startX}
                    y1={designHeight - 1}
                    x2={startX + totalStripWidth}
                    y2={designHeight - 1}
                    stroke="#ECE7DF"
                    strokeWidth={3.5}
                    strokeLinecap="square"
                  />

                  {/* Vertical Bay Dividers: exactly at slot boundaries (startX + i * slotWidth) */}
                  {[0, 1, 2, 3, 4].map(i => {
                    const lineX = startX + i * slotWidth;
                    return (
                      <React.Fragment key={`bay-divider-${i}`}>
                        {/* Upper row divider (S1..S4) */}
                        <line
                          x1={lineX}
                          y1={1}
                          x2={lineX}
                          y2={lane0LedY}
                          stroke="#ECE7DF"
                          strokeWidth={3.5}
                          strokeLinecap="square"
                        />
                        {/* Lower row divider (S5..S8) */}
                        <line
                          x1={lineX}
                          y1={lane1LedY}
                          x2={lineX}
                          y2={designHeight - 1}
                          stroke="#ECE7DF"
                          strokeWidth={3.5}
                          strokeLinecap="square"
                        />
                      </React.Fragment>
                    );
                  })}
                </g>
              </g>
              <g id="road-painted-parking-marking" className="pointer-events-none select-none">
                <g filter="url(#road-paint-texture)" opacity={0.93}>
                  {/* Left Chevron 1 */}
                  <path
                    d="M 6 264 L 18 264 L 34 295 L 18 326 L 6 326 L 22 295 Z"
                    fill="#F3B728"
                    stroke="#F3B728"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />

                  {/* Left Chevron 2 */}
                  <path
                    d="M 23 264 L 35 264 L 51 295 L 35 326 L 23 326 L 39 295 Z"
                    fill="#F3B728"
                    stroke="#F3B728"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />

                  {/* Taller central banner */}
                  <path
                    d="M 40 264 L 154 264 L 170 295 L 154 326 L 40 326 L 56 295 Z"
                    fill="#F3B728"
                    stroke="#F3B728"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />

                  {/* PARKING — bold, condensed industrial typography */}
                  <text
                    x={105}
                    y={295}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill="#000000ff"
                    fontSize={28}
                    fontWeight={900}
                    fontFamily="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
                    letterSpacing={0.3}
                  >
                    PARKING
                  </text>

                  {/* Right Chevron 1 */}
                  <path
                    d="M 159 264 L 171 264 L 187 295 L 171 326 L 159 326 L 175 295 Z"
                    fill="#F3B728"
                    stroke="#F3B728"
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />

                  {/* Right Chevron 2 */}
                  <path
                    d="M 176 264 L 188 264 L 204 295 L 188 326 L 176 326 L 192 295 Z"
                    fill="#F3B728"
                    stroke="#F3B728"
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                </g>
              </g>


              {/* =============================================================== */}
              {/* REALISTIC IN-GROUND CENTER ROAD LED STRIP                      */}
              {/* =============================================================== */}
              <g id="center-road-led-strip" className="pointer-events-none select-none">
                {/* Embedded asphalt channel along the middle of the road */}
                <rect
                  x={226}
                  y={entranceY - 4}
                  width={designWidth - 226 - 16}
                  height={8}
                  rx={4}
                  fill="#121417"
                  stroke="#35383f"
                  strokeWidth={0.8}
                />
                {/* Inner dark trough */}
                <rect
                  x={228}
                  y={entranceY - 2}
                  width={designWidth - 228 - 18}
                  height={4}
                  rx={2}
                  fill="#08090b"
                />
                {/* Discrete embedded drive-over LED capsule lenses along center strip */}
                {Array.from({ length: 48 }).map((_, i) => {
                  const x = 240 + i * 17.5;
                  if (x > designWidth - 28) return null;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={entranceY} r={1.8} fill="#1a1c20" stroke="#454952" strokeWidth={0.5} />
                      <circle cx={x} cy={entranceY} r={0.75} fill="#626875" opacity={0.7} />
                    </g>
                  );
                })}
              </g>

              {/* =============================================================== */}
              {/* ENTRY ZONE: GUARD BOOTH, SIGN & STRIPED BARRIER ARM             */}
              {/* =============================================================== */}
              <g id="entry-gate-zone">
                {/* Guard Booth: ~56 x 48 above top kerb, #1d1f22 with #7b7e83 border, darker window, green status light */}
                <g id="guard-booth">
                  {/* Booth Body */}
                  <rect
                    x={144}
                    y={176}
                    width={56}
                    height={48}
                    rx={6}
                    fill="#1d1f22"
                    stroke="#7b7e83"
                    strokeWidth={1.5}
                  />
                  {/* Darker Window */}
                  <rect
                    x={152}
                    y={188}
                    width={40}
                    height={22}
                    rx={3}
                    fill="#0d0e10"
                    stroke="#35383c"
                    strokeWidth={1}
                  />
                  {/* Status Light: green, amber, or red */}
                  <circle
                    cx={190}
                    cy={184}
                    r={2.5}
                    fill={boothLightColor}
                    filter={`drop-shadow(0 0 4px ${boothLightColor})`}
                  />
                </g>

                {/* ENTRY Plate Sign */}
                <g id="entry-sign-plate" transform="translate(100, 192)">
                  <rect
                    x={0}
                    y={0}
                    width={38}
                    height={20}
                    rx={4}
                    fill="#1d1f22"
                    stroke={fxBarrier?.entrySignGlow ? '#E0A84B' : '#7b7e83'}
                    strokeWidth={1.5}
                    filter={fxBarrier?.entrySignGlow ? 'drop-shadow(0 0 8px rgba(224, 168, 75, 0.9))' : undefined}
                  />
                  <text
                    x={19}
                    y={13}
                    textAnchor="middle"
                    fill={fxBarrier?.entrySignGlow ? '#E0A84B' : '#d2c8bb'}
                    fontSize={8}
                    fontFamily="Hanken Grotesk, system-ui, sans-serif"
                    fontWeight="700"
                    letterSpacing="0.05em"
                  >
                    ENTRY
                  </text>
                </g>

                {/* Barrier: post on top kerb, receiver post on bottom kerb, and striped arm */}
                <g id="entry-barrier">
                  {/* Top kerb post */}
                  <rect x={205} y={220} width={8} height={14} rx={2} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />
                  {/* Bottom kerb receiver post */}
                  <rect x={205} y={356} width={8} height={14} rx={2} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />

                  {/* Striped Barrier Arm: raised when open, lowered across road when closed */}
                  <g
                    style={{
                      transform: (barrierArmRaised || fxBarrier?.armRaised) ? 'rotate(-65deg)' : 'rotate(0deg)',
                      transformOrigin: `209px ${lane0LedY}px`,
                      transition: 'transform 0.5s ease-in-out',
                    }}
                  >
                    <rect
                      x={206}
                      y={lane0LedY}
                      width={6}
                      height={aisleHeight}
                      rx={2}
                      fill="url(#barrier-stripes)"
                      stroke="#1C1917"
                      strokeWidth={0.75}
                    />
                  </g>

                  {/* Post pivot bolt */}
                  <circle cx={209} cy={lane0LedY} r={3.5} fill="#7b7e83" stroke="#1d1f22" strokeWidth={1} />
                  <circle cx={209} cy={lane0LedY} r={1.5} fill="#FFFFFF" />
                </g>
              </g>

              {/* Claim 12 Step 1: Car waiting at entry gate before the barrier */}
              {gateCarState === 'atGate' && (
                <g id="claim-12-gate-car" transform={`translate(136, ${entranceY - 18})`}>
                  <CarSvg width={68} height={36} color="#3B8A88" orientation="landscape" />
                </g>
              )}

              {/* Claim 12 Step 6: "No phone or app was needed" badge */}
              {(noAppBadgeVisible || highlightSubsystem === 'noApp' || highlightSubsystem === 'noAppBadge') && (
                <g id="claim-12-no-app-badge" transform={`translate(136, ${entranceY - 145})`} className="motion-safe:animate-fade-in">
                  <rect
                    x={0}
                    y={0}
                    width={116}
                    height={24}
                    rx={5}
                    fill="#1d1f22"
                    stroke="#5FD08A"
                    strokeWidth={1.5}
                    filter="drop-shadow(0 0 8px rgba(95, 208, 138, 0.8))"
                  />
                  <text
                    x={58}
                    y={16}
                    textAnchor="middle"
                    fill="#5FD08A"
                    fontSize={10}
                    fontFamily="Hanken Grotesk, system-ui, sans-serif"
                    fontWeight="600"
                  >
                    ✔ No app needed
                  </text>
                </g>
              )}
            </g>


            {/* ================================================================= */}
            {/* 2. PHYSICAL WS2812 LED STRIPS LAYER                               */}
            {/* ================================================================= */}
            <LedStripSvg
              ledFrame={state.ledFrame}
              startX={startX}
              lane0Y={lane0LedY}
              lane1Y={lane1LedY}
              totalWidth={totalStripWidth}
              slotWidth={slotWidth}
              slotGap={slotGap}
            />



            {/* ================================================================= */}
            {/* 3. ANIMATED NAVIGATION GUIDANCE ROUTE (Starts at Gate Exit)       */}
            {/* ================================================================= */}
            <NavigationRoute
              slots={state.slots}
              slotWidth={slotWidth}
              slotGap={slotGap}
              startX={startX}
              entranceX={gateExitX}
              entranceY={entranceY}
              lane0Y={lane0LedY}
              lane1Y={lane1LedY}
            />

            {/* Claim 12 Step 4: Car follows lights along route to S7 */}
            {(gateCarState === 'followingRoute' || highlightSubsystem === 'carRoute' || highlightSubsystem === 'carFollowRoute') && (
              <g id="claim-12-car-follower">
                <g transform="translate(-34, -18)">
                  <CarSvg width={68} height={36} color="#3B8A88" orientation="landscape" />
                </g>
                <animateMotion
                  dur={`${(t(2400) / 1000).toFixed(2)}s`}
                  repeatCount="1"
                  fill="freeze"
                  rotate="auto"
                >
                  <mpath href="#route-branch-6" />
                </animateMotion>
              </g>
            )}

            {/* Claim 12: Faint green trail left on road that fades after 1.2s */}
            {fxDriverCar?.greenTrail && fxDriverCar.greenTrail.length > 0 && (
              <g id="claim-12-car-trail" className="pointer-events-none select-none">
                {fxDriverCar.greenTrail.map(pt => (
                  <ellipse
                    key={pt.id}
                    cx={pt.x}
                    cy={pt.y}
                    rx={12}
                    ry={5}
                    fill="rgba(0, 255, 0, 0.35)"
                    opacity={pt.opacity}
                    filter="drop-shadow(0 0 6px rgba(0, 255, 0, 0.8))"
                  />
                ))}
              </g>
            )}

            {/* Claim 12: pathGhost thin dotted summary line from gate to S7 */}
            {fxPathGhost?.visible && (
              <g id="claim-12-path-ghost" className="pointer-events-none select-none" opacity={fxPathGhost.opacity}>
                <path
                  d={`M 222 ${entranceY} L 767 ${entranceY} C 785 ${entranceY}, 799 ${entranceY + 24}, 799 350 L 799 440`}
                  fill="none"
                  stroke="#5FD08A"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 6px rgba(95, 208, 138, 0.85))"
                />
              </g>
            )}

            {/* Claim 12: phoneBadge "No app needed" with phone icon crossed by diagonal slash */}
            {fxPhoneBadge?.visible && (
              <motion.g
                id="claim-12-phone-badge"
                transform="translate(60, 95)"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9, y: 105 }}
                animate={{ opacity: 1, scale: 1, y: 95 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' }}
                className="select-none pointer-events-none"
              >
                {/* Glass G3 pill container */}
                <rect
                  x={0}
                  y={0}
                  width={160}
                  height={32}
                  rx={16}
                  fill="rgba(34, 29, 25, 0.92)"
                  stroke="rgba(224, 168, 75, 0.7)"
                  strokeWidth={1.5}
                  filter="drop-shadow(0 8px 24px rgba(0,0,0,0.7))"
                />
                {/* Top specular highlight rim */}
                <path
                  d="M 16 1.5 L 144 1.5"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={1}
                  strokeLinecap="round"
                />

                {/* Phone icon (x: 14..28, y: 7..25) */}
                <g transform="translate(14, 6)">
                  {/* Phone chassis */}
                  <rect
                    x={0}
                    y={0}
                    width={13}
                    height={20}
                    rx={2.5}
                    fill="none"
                    stroke="#E0A84B"
                    strokeWidth={1.5}
                  />
                  {/* Home button / speaker indicator */}
                  <circle cx={6.5} cy={16.5} r={1} fill="#E0A84B" />
                  <line x1={4} y1={2.5} x2={9} y2={2.5} stroke="#E0A84B" strokeWidth={1} strokeLinecap="round" />

                  {/* Animated diagonal slash (\) across the phone */}
                  <motion.line
                    x1={-2}
                    y1={-1}
                    x2={15}
                    y2={21}
                    stroke="#EF6B6B"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={shouldReduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: 'easeOut', delay: 0.15 }}
                    filter="drop-shadow(0 0 3px rgba(239, 107, 107, 0.8))"
                  />
                </g>

                {/* Badge Text */}
                <text
                  x={36}
                  y={20.5}
                  fill="#F6F0E8"
                  fontSize={12}
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.02em"
                >
                  No app needed
                </text>
              </motion.g>
            )}

            {/* Claim 7 & 12: Driver / Entry Car (Blue car with headlights & brake lights) */}
            {fxDriverCar?.visible && (
              <g
                id="claim-7-driver-car"
                transform={`translate(${fxDriverCar.x}, ${fxDriverCar.y})`}
                className="select-none pointer-events-none"
              >
                {/* Headlight Cones (Shining forward in driving direction) */}
                {fxDriverCar.headlights && (
                  <g opacity={fxDriverCar.headlightFlash ? 1 : 0.6}>
                    <polygon
                      points="34,-10 110,-24 110,-2 34,-5"
                      fill="url(#headlight-beam-gradient)"
                      filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.7))"
                    />
                    <polygon
                      points="34,5 110,2 110,24 34,10"
                      fill="url(#headlight-beam-gradient)"
                      filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.7))"
                    />
                  </g>
                )}

                {/* Brake Lights Halo (Rear of car at -34px) */}
                {fxDriverCar.brakeLights && (
                  <g>
                    <circle cx={-34} cy={-9} r={8} fill="#EF4444" filter="drop-shadow(0 0 8px rgba(239, 68, 68, 1))" opacity={0.9} />
                    <circle cx={-34} cy={9} r={8} fill="#EF4444" filter="drop-shadow(0 0 8px rgba(239, 68, 68, 1))" opacity={0.9} />
                  </g>
                )}

                {/* Vehicle Body Sprite */}
                <g transform="translate(-34, -18)">
                  <CarSvg width={68} height={36} color="#2563EB" orientation="landscape" rotation={fxDriverCar.rotation} />
                </g>
              </g>
            )}

            {/* Claim 7: Intruder Car (Orange car entering from right aisle & reversing into S2) */}
            {fxIntruderCar?.visible && (
              <g
                id="claim-7-intruder-car"
                transform={`translate(${fxIntruderCar.x}, ${fxIntruderCar.y})`}
                className="select-none pointer-events-none"
              >
                {/* White Reverse Lights at rear when isReversing */}
                {fxIntruderCar.isReversing && (
                  <g opacity={0.85}>
                    <circle cx={34} cy={-8} r={5} fill="#FFFFFF" filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))" />
                    <circle cx={34} cy={8} r={5} fill="#FFFFFF" filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))" />
                  </g>
                )}

                {/* Vehicle Body Sprite */}
                <g transform="translate(-34, -18)">
                  <CarSvg
                    width={68}
                    height={36}
                    color="#EA580C"
                    orientation="landscape"
                    rotation={fxIntruderCar.rotation}
                    isReversing={fxIntruderCar.isReversing}
                  />
                </g>
              </g>
            )}

            {/* Claim 5 Step 2: Position labels Pos 0, 1, 2, 3 above/below columns */}
            {positionLabelsVisible && (
              <g id="claim-5-position-labels" className="pointer-events-none">
                {[0, 1, 2, 3].map(col => {
                  const colCenterX = startX + col * (slotWidth + slotGap) + slotWidth * 0.5;
                  return (
                    <React.Fragment key={col}>
                      <g transform={`translate(${colCenterX - 22}, ${upperRowY + 4})`}>
                        <rect x={0} y={0} width={44} height={14} rx={3} fill="#1C1815" stroke="#E0A84B" strokeWidth={1} />
                        <text x={22} y={10.5} textAnchor="middle" fill="#E0A84B" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="600">
                          Pos {col}
                        </text>
                      </g>
                      <g transform={`translate(${colCenterX - 22}, ${lowerRowY + slotHeight - 18})`}>
                        <rect x={0} y={0} width={44} height={14} rx={3} fill="#1C1815" stroke="#E0A84B" strokeWidth={1} />
                        <text x={22} y={10.5} textAnchor="middle" fill="#E0A84B" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="600">
                          Pos {col}
                        </text>
                      </g>
                    </React.Fragment>
                  );
                })}
              </g>
            )}

            {/* Claim 1 Step 6: Dashboard Telemetry Chip at Top-Right */}
            {dashboardChipVisible && (
              <g transform={`translate(${designWidth - 275}, 6)`} className="motion-safe:animate-fade-in pointer-events-none">
                <rect
                  x={0}
                  y={0}
                  width={263}
                  height={28}
                  rx={6}
                  fill="#151210"
                  stroke="#E0A84B"
                  strokeWidth={1.5}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.6))"
                />
                <circle cx={14} cy={14} r={4.5} fill="#5FD08A" className="motion-safe:animate-pulse" />
                <circle cx={14} cy={14} r={2} fill="#FFFFFF" />
                <text
                  x={26}
                  y={18}
                  fill="#F6F0E8"
                  fontSize={10.5}
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  fontWeight="600"
                >
                  Dashboard: 3 occupied, 5 vacant, target S2
                </text>
              </g>
            )}

            {/* ================================================================= */}
            {/* 4. 8 PARKING SLOTS (UPPER ROW S1-S4 & LOWER ROW S5-S8)             */}
            {/* ================================================================= */}
            <g id="slots-layer">
              {/* Upper Row: S1 - S4 (Lane 0) */}
              {state.slots.slice(0, 4).map((slot, idx) => {
                const slotX = startX + idx * (slotWidth + slotGap);
                return (
                  <SlotCard
                    key={slot.slotIndex}
                    slot={slot}
                    lane={0}
                    x={slotX}
                    y={upperRowY}
                    width={slotWidth}
                    height={slotHeight}
                    isSelected={selectedSlotIndex === slot.slotIndex}
                    onClick={e => handleSlotClick(slot.slotIndex, e)}
                    hideDistance={scale < 0.75}
                  />
                );
              })}

              {/* Lower Row: S5 - S8 (Lane 1) */}
              {state.slots.slice(4, 8).map((slot, idx) => {
                const slotX = startX + idx * (slotWidth + slotGap);
                return (
                  <SlotCard
                    key={slot.slotIndex}
                    slot={slot}
                    lane={1}
                    x={slotX}
                    y={lowerRowY}
                    width={slotWidth}
                    height={slotHeight}
                    isSelected={selectedSlotIndex === slot.slotIndex}
                    onClick={e => handleSlotClick(slot.slotIndex, e)}
                    hideDistance={scale < 0.75}
                  />
                );
              })}
            </g>

            {/* ================================================================= */}
            {/* 5. FX OVERLAY LAYERS: RULER, ARROW, SCAN, CHIPS & DASHBOARD       */}
            {/* ================================================================= */}
            {/* FX Position Ruler & Column Bands (Claim 5) */}
            {fxPositionRuler?.visible && (
              <g id="fx-position-ruler-layer" className="pointer-events-none select-none">
                {/* Vertical Column Bands */}
                {[0, 1, 2, 3].map(col => {
                  if (!fxPositionRuler.visibleColumns.includes(col)) return null;
                  const isHighlighted = fxPositionRuler.activeHighlightColumn === col;
                  const colX = startX + col * (slotWidth + slotGap);

                  return (
                    <motion.rect
                      key={`ruler-col-band-${col}`}
                      x={colX}
                      y={8}
                      width={slotWidth}
                      height={designHeight - 16}
                      rx={6}
                      fill={isHighlighted ? 'rgba(224, 168, 75, 0.14)' : 'rgba(224, 168, 75, 0.035)'}
                      stroke={isHighlighted ? '#E0A84B' : 'rgba(224, 168, 75, 0.18)'}
                      strokeWidth={isHighlighted ? 1.5 : 1}
                      strokeDasharray={isHighlighted ? undefined : '4 4'}
                      initial={shouldReduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: shouldReduceMotion ? 0 : t(250) / 1000 }}
                    />
                  );
                })}

                {/* Painted Measuring Ticks & Labels along both aisle edges */}
                {fxPositionRuler.visibleColumns.map(col => {
                  const colCenterX = startX + col * (slotWidth + slotGap) + slotWidth * 0.5;

                  return (
                    <g key={`ruler-tick-${col}`}>
                      {/* Top aisle edge tick (lane 0 boundary) */}
                      <line
                        x1={colCenterX}
                        y1={lane0LedY - 4}
                        x2={colCenterX}
                        y2={lane0LedY + 8}
                        stroke="#E0A84B"
                        strokeWidth={2}
                      />
                      <text
                        x={colCenterX}
                        y={lane0LedY + 22}
                        textAnchor="middle"
                        fill="#E0A84B"
                        fontSize={11}
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="600"
                        letterSpacing="0.05em"
                      >
                        Pos {col}
                      </text>

                      {/* Bottom aisle edge tick (lane 1 boundary) */}
                      <line
                        x1={colCenterX}
                        y1={lane1LedY - 8}
                        x2={colCenterX}
                        y2={lane1LedY + 4}
                        stroke="#E0A84B"
                        strokeWidth={2}
                      />
                      <text
                        x={colCenterX}
                        y={lane1LedY - 14}
                        textAnchor="middle"
                        fill="#E0A84B"
                        fontSize={11}
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="600"
                        letterSpacing="0.05em"
                      >
                        Pos {col}
                      </text>
                    </g>
                  );
                })}

                {/* Entrance Flag at the left */}
                <g id="ruler-entrance-flag" transform="translate(262, 280)">
                  <line x1={28} y1={-25} x2={28} y2={45} stroke="#8a8d91" strokeWidth={2} />
                  <rect
                    x={-34}
                    y={-24}
                    width={62}
                    height={18}
                    rx={9}
                    fill="rgba(34, 29, 25, 0.95)"
                    stroke="#E0A84B"
                    strokeWidth={1.2}
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                  />
                  <text
                    x={-3}
                    y={-11.5}
                    textAnchor="middle"
                    fill="#E0A84B"
                    fontSize={9.5}
                    fontFamily="Hanken Grotesk, system-ui, sans-serif"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    ENTRANCE
                  </text>
                  <polygon points="20,-15 26,-15 23,-11" fill="#E0A84B" />
                </g>
              </g>
            )}

            {/* FX Measure Arrow (Claim 5) */}
            {fxMeasureArrow?.visible && (
              <g id="fx-measure-arrow-layer" className="pointer-events-none select-none">
                {/* Arrow Shaft along aisle centre line (entranceY = 295) */}
                <motion.line
                  x1={220}
                  y1={entranceY}
                  animate={{ x2: fxMeasureArrow.targetX }}
                  y2={entranceY}
                  stroke="#E0A84B"
                  strokeWidth={3}
                  strokeDasharray="6 3"
                  filter="drop-shadow(0 0 6px rgba(224, 168, 75, 0.8))"
                  transition={{ duration: shouldReduceMotion ? 0 : t(450) / 1000, ease: 'easeOut' }}
                />
                {/* Sleek Arrow Head */}
                <motion.g
                  animate={{ x: fxMeasureArrow.targetX }}
                  transition={{ duration: shouldReduceMotion ? 0 : t(450) / 1000, ease: 'easeOut' }}
                >
                  <polygon
                    points={`-2,${entranceY - 6} 12,${entranceY} -2,${entranceY + 6}`}
                    fill="#E0A84B"
                    filter="drop-shadow(0 0 6px rgba(224, 168, 75, 0.95))"
                  />
                  <circle cx={0} cy={entranceY} r={3.5} fill="#FFFFFF" />
                  <circle
                    cx={0}
                    cy={entranceY}
                    r={8}
                    fill="none"
                    stroke="#E0A84B"
                    strokeWidth={1.5}
                    className="motion-safe:animate-ping"
                    style={{ transformOrigin: `0px ${entranceY}px` }}
                  />
                </motion.g>
              </g>
            )}

            {/* FX Scan Band and check/cross results */}
            {fxScanState?.active && (
              <g id="fx-scan-layer" className="pointer-events-none select-none">
                {/* Moving vertical scan band */}
                <rect
                  x={startX + fxScanState.currentColumn * (slotWidth + slotGap)}
                  y={0}
                  width={slotWidth}
                  height={designHeight}
                  fill="url(#scan-band-gradient)"
                />
                <line
                  x1={startX + fxScanState.currentColumn * (slotWidth + slotGap) + slotWidth}
                  y1={0}
                  x2={startX + fxScanState.currentColumn * (slotWidth + slotGap) + slotWidth}
                  y2={designHeight}
                  stroke="#6FB8D6"
                  strokeWidth={2}
                  opacity={0.8}
                  filter="drop-shadow(0 0 6px rgba(111, 184, 214, 0.9))"
                />
                {/* Slot Check / Cross markers */}
                {Object.entries(fxScanState.results).map(([sIdxStr, res]) => {
                  const sIdx = Number(sIdxStr);
                  const col = sIdx % 4;
                  const isUpper = sIdx < 4;
                  const cx = startX + col * (slotWidth + slotGap) + slotWidth * 0.5;
                  const cy = isUpper ? upperRowY + slotHeight * 0.5 : lowerRowY + slotHeight * 0.5;
                  const isCheck = res === 'check';

                  return (
                    <g key={sIdx} transform={`translate(${cx - 16}, ${cy - 16})`}>
                      <circle
                        cx={16}
                        cy={16}
                        r={16}
                        fill={isCheck ? 'rgba(95, 208, 138, 0.25)' : 'rgba(239, 107, 107, 0.25)'}
                        stroke={isCheck ? '#5FD08A' : '#EF6B6B'}
                        strokeWidth={2}
                        filter={`drop-shadow(0 0 6px ${isCheck ? 'rgba(95, 208, 138, 0.8)' : 'rgba(239, 107, 107, 0.8)'})`}
                      />
                      <text
                        x={16}
                        y={21}
                        textAnchor="middle"
                        fill={isCheck ? '#5FD08A' : '#EF6B6B'}
                        fontSize={15}
                        fontWeight="bold"
                      >
                        {isCheck ? '✔' : '✖'}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* FX Chips (G3 Recipe, collision-avoiding placement) */}
            {fxChips.filter(c => c.visible).map((c, idx) => {
              let chipX = 24;
              let chipY = 28 + idx * 36;
              if (typeof c.anchor === 'object') {
                if ('type' in c.anchor && c.anchor.type === 'slot') {
                  const col = c.anchor.slot % 4;
                  const isUpper = c.anchor.slot < 4;
                  chipX = startX + col * (slotWidth + slotGap) + 18;
                  chipY = isUpper ? lane0LedY - 32 : lane1LedY + 12;
                } else if ('type' in c.anchor && c.anchor.type === 'coord') {
                  chipX = c.anchor.x;
                  chipY = c.anchor.y;
                } else if ('x' in c.anchor && 'y' in c.anchor) {
                  chipX = c.anchor.x;
                  chipY = c.anchor.y;
                }
              }

              return (
                <g
                  key={c.id}
                  id={c.id}
                  transform={`translate(${chipX}, ${chipY})`}
                  className="pointer-events-none select-none motion-safe:animate-fade-in"
                >
                  <rect
                    x={0}
                    y={0}
                    width={150}
                    height={24}
                    rx={12}
                    fill="rgba(34, 29, 25, 0.92)"
                    stroke="#E0A84B"
                    strokeWidth={1.2}
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.6))"
                  />
                  {c.icon === 'spinner' ? (
                    <g transform="translate(14, 12)">
                      <circle cx={0} cy={0} r={5} fill="none" stroke="rgba(224, 168, 75, 0.3)" strokeWidth={1.5} />
                      <path
                        d="M 0 -5 A 5 5 0 0 1 5 0"
                        fill="none"
                        stroke="#E0A84B"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        className="motion-safe:animate-spin"
                        style={{ transformOrigin: '0px 0px' }}
                      />
                    </g>
                  ) : c.icon ? (
                    <text x={12} y={16} fill="#E0A84B" fontSize={11} fontWeight="bold">
                      {c.icon === 'check' ? '✔' : c.icon === 'cross' ? '✖' : '★'}
                    </text>
                  ) : null}
                  <text
                    x={c.icon ? 28 : 75}
                    y={16}
                    textAnchor={c.icon ? 'start' : 'middle'}
                    fill="#F6F0E8"
                    fontSize={10.5}
                    fontFamily="Hanken Grotesk, system-ui, sans-serif"
                    fontWeight="600"
                  >
                    {c.text}
                  </text>
                </g>
              );
            })}

            {/* FX Dashboard Telemetry Card (Empty ground area left of slots above entry road) */}
            {fxDashboardCard?.visible && (
              <motion.g
                id="fx-dashboard-telemetry-card"
                initial={shouldReduceMotion ? false : { x: -260, opacity: 0 }}
                animate={{ x: 20, opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { x: -260, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : t(450) / 1000, ease: 'easeOut' }}
                transform="translate(20, 24)"
                className="pointer-events-none select-none"
              >
                {/* Outer Card Glass G1 Panel */}
                <rect
                  x={0}
                  y={0}
                  width={248}
                  height={132}
                  rx={16}
                  fill="rgba(26, 23, 20, 0.94)"
                  stroke="rgba(224, 168, 75, 0.6)"
                  strokeWidth={1.5}
                  filter="drop-shadow(0 12px 32px rgba(0,0,0,0.75))"
                />
                {/* Header Band */}
                <rect
                  x={0}
                  y={0}
                  width={248}
                  height={34}
                  rx={16}
                  fill="rgba(224, 168, 75, 0.12)"
                />
                {/* Wi-Fi Icon with 3 Radiating Arcs */}
                <g transform="translate(18, 17)">
                  <circle cx={0} cy={4} r={2} fill="#5FD08A" />
                  <path
                    d="M -5 1 A 7 7 0 0 1 5 1"
                    fill="none"
                    stroke="#5FD08A"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    className="motion-safe:animate-pulse"
                  />
                  <path
                    d="M -9 -3 A 12 12 0 0 1 9 -3"
                    fill="none"
                    stroke="#5FD08A"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    className="motion-safe:animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <path
                    d="M -13 -7 A 17 17 0 0 1 13 -7"
                    fill="none"
                    stroke="#5FD08A"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    className="motion-safe:animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </g>
                <text
                  x={44}
                  y={21.5}
                  fill="#F6F0E8"
                  fontSize={11.5}
                  fontFamily="Hanken Grotesk, system-ui, sans-serif"
                  fontWeight="bold"
                >
                  Web Dashboard Telemetry
                </text>

                {/* Live Counts Row */}
                <g transform="translate(16, 46)">
                  {/* Occupied Box */}
                  <rect x={0} y={0} width={66} height={46} rx={8} fill="rgba(239, 107, 107, 0.12)" stroke="#EF6B6B" strokeWidth={1} />
                  <text x={33} y={15} textAnchor="middle" fill="#A99F92" fontSize={8} fontFamily="Hanken Grotesk, sans-serif" fontWeight="600">
                    OCCUPIED
                  </text>
                  <text x={33} y={37} textAnchor="middle" fill="#EF6B6B" fontSize={18} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">
                    {Math.round(fxDashboardCard.data.occupied * fxDashboardCard.countProgress)}
                  </text>

                  {/* Vacant Box */}
                  <rect x={74} y={0} width={66} height={46} rx={8} fill="rgba(95, 208, 138, 0.12)" stroke="#5FD08A" strokeWidth={1} />
                  <text x={107} y={15} textAnchor="middle" fill="#A99F92" fontSize={8} fontFamily="Hanken Grotesk, sans-serif" fontWeight="600">
                    VACANT
                  </text>
                  <text x={107} y={37} textAnchor="middle" fill="#5FD08A" fontSize={18} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">
                    {Math.round(fxDashboardCard.data.vacant * fxDashboardCard.countProgress)}
                  </text>

                  {/* Target Box */}
                  <rect x={148} y={0} width={68} height={46} rx={8} fill="rgba(224, 168, 75, 0.15)" stroke="#E0A84B" strokeWidth={1} />
                  <text x={182} y={15} textAnchor="middle" fill="#A99F92" fontSize={8} fontFamily="Hanken Grotesk, sans-serif" fontWeight="600">
                    TARGET
                  </text>
                  <text x={182} y={37} textAnchor="middle" fill="#E0A84B" fontSize={16} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">
                    {fxDashboardCard.data.target}
                  </text>
                </g>

                {/* Footer live status text */}
                <text
                  x={18}
                  y={116}
                  fill="#A99F92"
                  fontSize={8.5}
                  fontFamily="IBM Plex Mono, monospace"
                >
                  ● HTTP GET /status • 200 OK • Wi-Fi 2.4 GHz
                </text>
              </motion.g>
            )}
          </svg>

          {/* Scene Director Overlay (pins, callouts, spotlights, panels) */}
          <SceneOverlay scale={scale} />
        </div>

        {/* Subtle Status & Legend Bar under the lot */}
        <div className="w-full max-w-[960px] mt-3.5 px-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] font-ui text-text-3">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-text-2">
              <span className="w-2 h-2 rounded-full bg-[#EF6B6B] shadow-[0_0_6px_rgba(239,107,107,0.6)]" />
              Occupied (Red)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-text-2">
              <span className="w-2 h-2 rounded-full bg-[#5FD08A] shadow-[0_0_6px_rgba(95,208,138,0.6)]" />
              Vacant (Green)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-text-2">
              <span className="w-2 h-2 rounded-full bg-[#E0A84B] shadow-[0_0_6px_rgba(224,168,75,0.6)]" />
              Target (Flashing)
            </span>
          </div>
          <span className="text-text-3 font-mono text-[11px] hidden sm:inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            Click any sensor or slot to interact
          </span>
        </div>
      </div>
    </div>
  );
};
