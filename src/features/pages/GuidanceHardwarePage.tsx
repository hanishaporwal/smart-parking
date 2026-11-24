import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { Activity, Zap, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StatusPill } from '@/components/StatusPill';
import { PageHeader } from '@/components/PageHeader';
import { PatentArchitectureSvg, HotspotId } from '@/features/parking/PatentArchitectureSvg';
import { COMPONENT_INFO, Fig3Numeral, SYSTEM_OVERVIEW_INFO } from '@/features/fig3/componentInfo';
import { calcZoomStep } from '@/features/fig3/geometry';

export const GuidanceHardwarePage: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotId | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotId | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const HOTSPOT_SEQUENCE: (HotspotId | null)[] = [null, '101', '102', '103', '104', '105', '106', '107', '108'];

  const shiftHotspot = useCallback((direction: 'next' | 'prev') => {
    setSelectedHotspot(current => {
      const idx = HOTSPOT_SEQUENCE.indexOf(current);
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % HOTSPOT_SEQUENCE.length
          : (idx - 1 + HOTSPOT_SEQUENCE.length) % HOTSPOT_SEQUENCE.length;
      return HOTSPOT_SEQUENCE[nextIdx];
    });
  }, []);

  // Keyboard navigation: shift hotspot on ArrowLeft/ArrowRight (and ArrowUp/ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        shiftHotspot('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        shiftHotspot('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftHotspot]);

  // Keep active chip scrolled into view
  useEffect(() => {
    const key = selectedHotspot ?? 'all';
    chipRefs.current[key]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedHotspot]);

  const comp = selectedHotspot ? COMPONENT_INFO[selectedHotspot as Fig3Numeral] : SYSTEM_OVERVIEW_INFO;

  const handleZoomStep = (delta: number) => {
    const res = calcZoomStep(delta, zoom, pan);
    setZoom(res.zoom);
    setPan(res.pan);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' },
    },
  };

  return (
    <>
      {/* Visually hidden screen reader announcement on selection change */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedHotspot ? `Selected ${selectedHotspot}, ${comp.title}` : 'All systems active overview'}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Page Header */}
        <PageHeader
          title="Guidance & Hardware Architecture"
          badges={
            <>
              <Badge variant="gold" className="h-7 px-3 text-[11px]">
                Patent Fig 3 twin
              </Badge>
              <Badge variant="info" className="h-7 px-3 text-[11px]">
                ESP32 + WS2812
              </Badge>
              <StatusPill
                status="simulated"
                label="SIMULATED TELEMETRY"
                className="h-7 px-3 text-[11px]"
              />
            </>
          }
          subtitle="Interactive redraw of patent Fig 3. Click a reference numeral (101-108) to see its live data."
        />

        {/* Patent Figure 3 Interactive Redraw & Telemetry Inspector */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left (8 Cols): Interactive SVG Redraw in Clay Card */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <Card padding="none" className="overflow-hidden flex flex-col h-full justify-between">
              {/* Header area above the drawing with soft gold-tinted gradient band */}
              <div className="px-6 py-4 border-b border-border-1/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-b from-gold/14 via-gold/5 to-transparent">
                <div className="text-left">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-gold shrink-0" />
                    <h2 className="text-card-title text-text">
                      FIG. 3 — Hardware & Wiring Architecture
                    </h2>
                  </div>
                  <p className="text-caption text-text-2 mt-1">
                    IoT-based smart parking guidance system • Interactive reference numerals 101–108
                  </p>
                </div>
                <Badge variant="gold" size="xs" className="shrink-0 self-start sm:self-auto">
                  {selectedHotspot ? `Hotspot: ${selectedHotspot}` : 'All Systems Active'}
                </Badge>
              </div>

              <div className="p-0 bg-[#110E0C] flex-1 flex items-center justify-center overflow-hidden">
                <PatentArchitectureSvg
                  selectedId={selectedHotspot}
                  onSelect={id => setSelectedHotspot(prev => (prev === id ? null : id))}
                  hoveredId={hoveredHotspot}
                  onHover={setHoveredHotspot}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  pan={pan}
                  onPanChange={setPan}
                />
              </div>

              {/* Quick Hotspot Chips & Zoom Controls Bar */}
              <div className="py-[10px] px-3 sm:px-4 min-h-[56px] min-[900px]:h-[56px] glass-g2 border-t border-border-2 shadow-glass-g2 flex flex-wrap min-[900px]:flex-nowrap items-center justify-between gap-3 text-xs font-ui">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-caption text-text-3 shrink-0">
                    Hotspots:
                  </span>

                  {/* Previous Hotspot Arrow Button */}
                  <button
                    type="button"
                    onClick={() => shiftHotspot('prev')}
                    aria-label="Previous hotspot"
                    title="Previous hotspot (ArrowLeft)"
                    className="w-7 h-7 rounded-full flex items-center justify-center glass-g3 border border-border-3 text-text-2 hover:text-gold shadow-glass-g3 hover:scale-[1.08] active:scale-[0.96] transition-all shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    ref={el => { chipRefs.current['all'] = el; }}
                    type="button"
                    onClick={() => setSelectedHotspot(null)}
                    aria-label="All systems active overview"
                    aria-pressed={selectedHotspot === null}
                    className={`relative px-2.5 py-1 rounded-pill text-xs font-data tabular-nums font-medium transition-all active:scale-[0.96] border z-[1] shrink-0 ${selectedHotspot === null
                      ? 'text-gold border-gold/60 shadow-glass-g3 font-semibold'
                      : 'glass-g3 text-text-2 border-border-3 shadow-glass-g3 hover:text-text'
                      }`}
                  >
                    {selectedHotspot === null && (
                      <motion.div
                        layoutId="liquid-hotspot-indicator"
                        className="absolute inset-0 rounded-pill glass-g3 glass-tint-gold glass-rim-gold -z-[1]"
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      />
                    )}
                    All (Live)
                  </button>
                  {(['101', '102', '103', '104', '105', '106', '107', '108'] as const).map(num => (
                    <button
                      key={num}
                      ref={el => { chipRefs.current[num] = el; }}
                      type="button"
                      onClick={() => setSelectedHotspot(prev => (prev === num ? null : num))}
                      onPointerEnter={() => setHoveredHotspot(num)}
                      onPointerLeave={() => setHoveredHotspot(null)}
                      aria-label={`${num} ${COMPONENT_INFO[num].title}`}
                      aria-pressed={selectedHotspot === num}
                      className={`relative px-2.5 py-1 rounded-pill text-xs font-data tabular-nums font-medium transition-all active:scale-[0.96] border z-[1] shrink-0 ${selectedHotspot === num
                        ? 'text-gold border-gold/60 shadow-glass-g3 font-semibold'
                        : hoveredHotspot === num
                          ? 'glass-g3 text-text border-border-3 shadow-glass-g3'
                          : 'glass-g3 text-text-2 border-border-3 shadow-glass-g3 hover:text-text'
                        }`}
                    >
                      {selectedHotspot === num && (
                        <motion.div
                          layoutId="liquid-hotspot-indicator"
                          className="absolute inset-0 rounded-pill glass-g3 glass-tint-gold glass-rim-gold -z-[1]"
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        />
                      )}
                      {num}
                    </button>
                  ))}

                  {/* Next Hotspot Arrow Button */}
                  <button
                    type="button"
                    onClick={() => shiftHotspot('next')}
                    aria-label="Next hotspot"
                    title="Next hotspot (ArrowRight)"
                    className="w-7 h-7 rounded-full flex items-center justify-center glass-g3 border border-border-3 text-text-2 hover:text-gold shadow-glass-g3 hover:scale-[1.08] active:scale-[0.96] transition-all shrink-0 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right-aligned Zoom & Pan Controls (Floating Glass Capsule) */}
                <div
                  className="flex items-center gap-1.5 p-1 rounded-pill glass-g3-float glass-refract border border-white/[0.08] shadow-glass-g3 shrink-0 ml-auto"
                  role="toolbar"
                  aria-label="Diagram zoom and pan controls"
                >
                  <button
                    type="button"
                    onClick={() => handleZoomStep(-0.25)}
                    disabled={zoom <= 1.0}
                    aria-label="Zoom out"
                    title="Zoom out (-)"
                    className="w-8 h-8 rounded-full flex items-center justify-center glass-g3 disabled:opacity-40 disabled:cursor-not-allowed border border-border-3 text-[#F6F0E8] shadow-glass-g3 hover:scale-[1.08] active:scale-[0.96] transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className="px-2 py-0.5 text-xs font-data tabular-nums text-[#D2C8BB] font-medium min-w-[46px] text-center select-none"
                    aria-live="polite"
                  >
                    {Math.round(zoom * 100)}%
                  </span>

                  <button
                    type="button"
                    onClick={() => handleZoomStep(0.25)}
                    disabled={zoom >= 3.0}
                    aria-label="Zoom in"
                    title="Zoom in (+)"
                    className="w-8 h-8 rounded-full flex items-center justify-center glass-g3 disabled:opacity-40 disabled:cursor-not-allowed border border-border-3 text-[#F6F0E8] shadow-glass-g3 hover:scale-[1.08] active:scale-[0.96] transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right (5 Cols): Simplified Info Panel */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
            <Card className="h-full flex flex-col justify-start" padding="lg">
              <div className="flex-1 min-h-[460px] max-h-[600px] overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedHotspot || 'all'}
                    initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reducedMotion ? 0 : -12 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="space-y-5"
                  >
                    {/* Hotspot Header */}
                    <div className="pb-3.5 border-b border-border-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-pill bg-gold-tint text-gold border border-gold/50 font-ui font-semibold text-xs tracking-[0.06em] whitespace-nowrap shrink-0">
                          {selectedHotspot ? `REF ${selectedHotspot}` : 'ALL'}
                        </span>
                        <h3 className="text-card-title text-text truncate">
                          {comp.title}
                        </h3>
                      </div>
                      <span className="text-[13px] text-text-2 font-ui block mt-1 line-clamp-2 leading-relaxed">
                        {comp.subtitle}
                      </span>
                    </div>

                    {/* Section 1: What it is */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-text-3 uppercase tracking-[0.08em] block">
                        What it is
                      </span>
                      <p className="text-[15px] sm:text-[15.5px] text-text-2 leading-relaxed">
                        {comp.whatItIs}
                      </p>
                    </div>

                    {/* Section 2: What it does */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-text-3 uppercase tracking-[0.08em] block">
                        What it does
                      </span>
                      <ul className="space-y-2 text-[15px] sm:text-[15.5px] text-text-2">
                        {comp.whatItDoes.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2" aria-hidden="true" />
                            <span className="flex-1 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 3: In ParkWay */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-text-3 uppercase tracking-[0.08em] block">
                        In ParkWay
                      </span>
                      <ul className="space-y-2 text-[15px] sm:text-[15.5px] text-text-2">
                        {comp.inParkWay.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2" aria-hidden="true" />
                            <span className="flex-1 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Section 4: Technical */}
                    <div className="space-y-2 pt-1 border-t border-border-1">
                      <span className="text-caption font-semibold text-text-3 uppercase tracking-[0.06em] block">
                        Technical
                      </span>
                      <div className="divide-y divide-border-2 rounded-inner-card glass-g2 border border-border-2 px-3 py-1 shadow-glass-g2">
                        {comp.technical.map((row, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between py-2 text-xs gap-3"
                          >
                            <span className="text-text-2 font-ui shrink-0 font-medium">{row.label}</span>
                            <span className="font-data text-text text-right text-xs tabular-nums break-words">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Strip Data Pins & Bus Architecture Summary (Two Glass Cards with Gold GPIO Chips) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strip 1: GPIO 23 */}
          <Card variant="default" className="flex items-center justify-between h-full min-h-[96px]" padding="lg">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full glass-g3 shadow-glass-g3 border border-border-3 text-gold flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-ui text-sm font-semibold text-text">Strip 1 (Lane 0 / Upper)</span>
                  <span className="px-2.5 py-0.5 rounded-pill glass-g3 glass-tint-gold text-gold border border-gold/40 font-data text-xs font-medium tabular-nums shadow-glass-g3">
                    GPIO 23
                  </span>
                </div>
                <p className="text-caption text-text-2 mt-1">
                  Slots S1–S4 • 100 Pixels (25 px/slot) • 800 kHz WS2812 Protocol
                </p>
              </div>
            </div>
            <span className="text-caption text-text-3 shrink-0">Data out</span>
          </Card>

          {/* Strip 2: GPIO 15 */}
          <Card variant="default" className="flex items-center justify-between h-full min-h-[96px]" padding="lg">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full glass-g3 shadow-glass-g3 border border-border-3 text-gold flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-ui text-sm font-semibold text-text">Strip 2 (Lane 1 / Lower)</span>
                  <span className="px-2.5 py-0.5 rounded-pill glass-g3 glass-tint-gold text-gold border border-gold/40 font-data text-xs font-medium tabular-nums shadow-glass-g3">
                    GPIO 15
                  </span>
                </div>
                <p className="text-caption text-text-2 mt-1">
                  Slots S5–S8 • 100 Pixels (25 px/slot) • 800 kHz WS2812 Protocol
                </p>
              </div>
            </div>
            <span className="text-caption text-text-3 shrink-0">Data out</span>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
};
