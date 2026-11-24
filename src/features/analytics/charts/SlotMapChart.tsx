import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  Sliders,
  Flame,
} from 'lucide-react';
import { ChartCardShell } from './ChartCardShell';
import { SimulationAggregates, SlotMetric } from '@/analytics/types';
import { FACILITY_PRESETS } from '@/analytics/presets';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface SlotMapChartProps {
  aggregates: SimulationAggregates;
}

type MapColorMode = 'utilisation' | 'timelapse';
type PlaybackSpeed = 1 | 10 | 60;

export const SlotMapChart: React.FC<SlotMapChartProps> = ({ aggregates }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [colorMode, setColorMode] = useState<MapColorMode>('utilisation');
  const [currentHourIndex, setCurrentHourIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(10);

  // Hover state
  const [hoveredSlot, setHoveredSlot] = useState<{
    slot: SlotMetric;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Selected slot for popover
  const [selectedSlot, setSelectedSlot] = useState<SlotMetric | null>(null);

  const totalSlots = aggregates.totalSlots;
  const totalHours = aggregates.hourlyTotalOccupancy.length;
  const preset = FACILITY_PRESETS[aggregates.presetId];

  // Store layout bounds for hit detection
  const cellBoundsRef = useRef<
    { slot: SlotMetric; x: number; y: number; w: number; h: number }[]
  >([]);

  // Dead slots list (< 2% utilisation)
  const deadSlots = useMemo(() => {
    return (aggregates?.slots ?? [])
      .filter(s => s.isDeadSlot || s.utilisationPct < 2.0)
      .sort((a, b) => a.utilisationPct - b.utilisationPct);
  }, [aggregates?.slots]);

  // Color interpolator for utilisation mode: quiet (#1A1714) -> green (#5FD08A) -> gold (#E0A84B) -> red (#EF6B6B)
  const getUtilisationColor = (pct: number): string => {
    if (pct < 5) return '#221E1A';
    if (pct < 35) {
      const t = pct / 35;
      const r = Math.round(34 + t * (95 - 34));
      const g = Math.round(30 + t * (208 - 30));
      const b = Math.round(26 + t * (138 - 26));
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (pct < 70) {
      const t = (pct - 35) / 35;
      const r = Math.round(95 + t * (224 - 95));
      const g = Math.round(208 + t * (168 - 208));
      const b = Math.round(138 + t * (75 - 138));
      return `rgb(${r}, ${g}, ${b})`;
    }
    const t = Math.min(1, (pct - 70) / 30);
    const r = Math.round(224 + t * (239 - 224));
    const g = Math.round(168 + t * (107 - 168));
    const b = Math.round(75 + t * (107 - 75));
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Time-lapse playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = speed === 1 ? 400 : speed === 10 ? 100 : 25;
    const timer = setInterval(() => {
      setCurrentHourIndex(prev => (prev + 1) % totalHours);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, totalHours]);

  // Canvas drawing routine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const zones = preset.zones;
    const numZones = zones.length;
    const bounds: { slot: SlotMetric; x: number; y: number; w: number; h: number }[] = [];

    // Layout calculation: zones grouped horizontally or vertically
    // For small slot count (e.g. 8), draw 2 lanes of 4 slots.
    // For large presets (e.g. 600 slots across 6 zones), draw zone blocks.
    const padding = 16;
    const availableWidth = width - padding * 2;
    const zoneSpacing = 16;

    // Determine grid columns per zone
    const colsPerZone = numZones <= 2 ? numZones : Math.min(numZones, Math.floor(availableWidth / 260) || 1);
    const zoneBlockW = (availableWidth - (colsPerZone - 1) * zoneSpacing) / colsPerZone;

    let slotCounter = 0;

    zones.forEach((zone, zIdx) => {
      const col = zIdx % colsPerZone;
      const row = Math.floor(zIdx / colsPerZone);

      const zoneX = padding + col * (zoneBlockW + zoneSpacing);
      const zoneY = padding + row * 135;

      // Zone Header
      ctx.fillStyle = '#A99F92';
      ctx.font = '11px Hanken Grotesk, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${zone.id} · ${zone.name}`, zoneX, zoneY);

      // Slots in this zone
      const slotsInZone = (aggregates?.slots ?? []).slice(slotCounter, slotCounter + zone.slotCount);
      const bayPaddingTop = 18;

      // Determine cell size based on zone.slotCount
      let cellW = 20;
      let cellH = 20;
      let gap = 3;
      let baysPerRow = Math.floor((zoneBlockW - 8) / (cellW + gap));

      if (zone.slotCount <= 8) {
        cellW = 38;
        cellH = 34;
        gap = 6;
        baysPerRow = 4;
      } else if (zone.slotCount <= 30) {
        cellW = 24;
        cellH = 24;
        gap = 4;
        baysPerRow = Math.min(10, Math.floor((zoneBlockW - 8) / (cellW + gap)));
      } else {
        cellW = 14;
        cellH = 14;
        gap = 2.5;
        baysPerRow = Math.min(20, Math.floor((zoneBlockW - 8) / (cellW + gap)));
      }

      slotsInZone.forEach((slot, sIdx) => {
        const bayCol = sIdx % baysPerRow;
        const bayRow = Math.floor(sIdx / baysPerRow);

        const bx = zoneX + bayCol * (cellW + gap);
        const by = zoneY + bayPaddingTop + bayRow * (cellH + gap);

        bounds.push({ slot, x: bx, y: by, w: cellW, h: cellH });

        // Determine color
        let fillColor = '#2B2621';
        if (colorMode === 'utilisation') {
          fillColor = getUtilisationColor(slot.utilisationPct);
        } else {
          // Time-lapse state at currentHourIndex
          const isOccupied =
            aggregates?.slotHourlyOccupied?.[currentHourIndex * totalSlots + (slot.slotId - 1)] === 1;
          fillColor = isOccupied ? '#EF6B6B' : '#5FD08A';
        }

        // Draw Cell
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        const cr = Math.min(3, cellW / 4);
        ctx.roundRect(bx, by, cellW, cellH, cr);
        ctx.fill();

        // Dead Slot Dotted Outline
        if (slot.isDeadSlot || slot.utilisationPct < 2.0) {
          ctx.save();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = '#EF6B6B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx - 0.5, by - 0.5, cellW + 1, cellH + 1);
          ctx.restore();
        }

        // Slot ID text if cell is large enough
        if (cellW >= 24) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '9px IBM Plex Mono, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`S${slot.slotId}`, bx + cellW / 2, by + cellH / 2);
        }
      });

      slotCounter += zone.slotCount;
    });

    cellBoundsRef.current = bounds;
  }, [
    aggregates,
    colorMode,
    currentHourIndex,
    preset.zones,
    totalSlots,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer interactions
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = cellBoundsRef.current.find(
      b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
    );

    if (hit) {
      setHoveredSlot({
        slot: hit.slot,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    } else {
      setHoveredSlot(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = cellBoundsRef.current.find(
      b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
    );

    if (hit) {
      setSelectedSlot(hit.slot);
    }
  };

  // Format current hour for time-lapse
  const currentDay = Math.floor(currentHourIndex / 24) + 1;
  const currentHourOfDay = currentHourIndex % 24;
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDow = dowNames[(currentDay) % 7];

  const soWhatSentence = useMemo(() => {
    const deadCount = deadSlots.length;
    const suspectWithFault = deadSlots.filter(s => s.suspectFault);
    if (deadCount > 0) {
      return `Telemetry audit identified ${deadCount} dead bay${deadCount > 1 ? 's' : ''} (<2% utilisation) across ${totalSlots} spaces, with ${suspectWithFault.length} matching known sensor fault profiles (e.g. Slot S${deadSlots[0].slotId} flagged for ${deadSlots[0].suspectFault}). Automated health dispatch prevents drivers following lights to offline spaces.`;
    }
    return `All ${totalSlots} parking bays operating with balanced turnover (>2% utilisation) and active HC-SR04 ultrasonic sensor heartbeats. Diurnal time-lapse verifies smooth zone filling without persistent entry bottlenecks.`;
  }, [deadSlots, totalSlots]);

  // Accessible Table Representation
  const tableContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gold font-ui">
          Suspect & Dead Bays Audit ({deadSlots.length} bays under 2% utilisation)
        </h4>
      </div>

      {deadSlots.length === 0 ? (
        <div className="p-4 text-center text-xs text-text-3 font-ui">
          All {totalSlots} bays are fully operational with normal utilisation (&gt;2%).
        </div>
      ) : (
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Slot ID</th>
              <th className="py-2 px-3 font-medium">Zone</th>
              <th className="py-2 px-3 font-medium text-red">Utilisation %</th>
              <th className="py-2 px-3 font-medium">Sessions</th>
              <th className="py-2 px-3 font-medium">Mean Dwell</th>
              <th className="py-2 px-3 font-medium text-right">Suspect Sensor Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {deadSlots.map(s => (
              <tr key={s.slotId} className="hover:bg-white/[0.02]">
                <td className="py-1.5 px-3 font-medium text-text-1">S{s.slotId}</td>
                <td className="py-1.5 px-3 text-text-2">{s.zoneName}</td>
                <td className="py-1.5 px-3 font-data text-red">{s.utilisationPct}%</td>
                <td className="py-1.5 px-3 font-data text-text-3">{s.sessionCount}</td>
                <td className="py-1.5 px-3 font-data text-text-3">
                  {Math.round(s.meanDwellMinutes)} min
                </td>
                <td className="py-1.5 px-3 font-data text-right">
                  {s.suspectFault ? (
                    <span className="px-2 py-0.5 rounded-pill bg-red/10 text-red border border-red/20 text-[10.5px]">
                      {s.suspectFault} fault
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-pill bg-white/[0.04] text-text-3 text-[10.5px]">
                      low demand
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.slotMap.title}
      whatItTells={ANALYTICS_COPY.slotMap.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setColorMode('utilisation')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-ui transition-colors',
                colorMode === 'utilisation'
                  ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text-1'
              )}
            >
              <Flame className="w-3.5 h-3.5 text-gold" />
              <span>Utilisation %</span>
            </button>
            <button
              type="button"
              onClick={() => setColorMode('timelapse')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-ui transition-colors',
                colorMode === 'timelapse'
                  ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text-1'
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-green" />
              <span>State at Time (t)</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Scrubber Bar (Only when in timelapse mode or available) */}
        <div className="p-2.5 sm:p-3 rounded-lg glass-g2 border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Play/Pause & Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(prev => !prev)}
              aria-label={isPlaying ? 'Pause time-lapse' : 'Play time-lapse'}
              className="p-2 rounded-full glass-g3 text-gold border border-gold/30 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-gold" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentHourIndex(0);
              }}
              aria-label="Reset scrubber to start"
              className="p-2 rounded-full glass-g3 text-text-3 hover:text-text-1 border border-white/[0.06] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Current Timestamp Display */}
            <div className="pl-1 text-xs font-ui">
              <span className="font-semibold text-text-1">
                {currentDow} Day {currentDay} · {String(currentHourOfDay).padStart(2, '0')}:00
              </span>
              <span className="text-[11px] text-text-3 font-data block">
                Hour {currentHourIndex + 1} of {totalHours}
              </span>
            </div>
          </div>

          {/* Center: Slider */}
          <div className="flex-1 min-w-[200px] max-w-lg px-2">
            <input
              type="range"
              min={0}
              max={totalHours - 1}
              value={currentHourIndex}
              onChange={e => setCurrentHourIndex(Number(e.target.value))}
              aria-label="Time-lapse timeline scrubber"
              className="w-full accent-gold cursor-pointer h-1.5 rounded-pill bg-white/[0.1]"
            />
          </div>

          {/* Right: Playback Speed Buttons & Legend */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
              {([1, 10, 60] as PlaybackSpeed[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={clsx(
                    'px-2 py-0.5 rounded-pill text-[10.5px] font-data transition-colors',
                    speed === s
                      ? 'glass-g3 text-gold font-bold shadow-sm'
                      : 'text-text-3 hover:text-text-1'
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-text-3 pl-1 font-ui">
              {colorMode === 'timelapse' ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#5FD08A]" /> Vacant
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#EF6B6B]" /> Occupied
                  </span>
                </>
              ) : (
                <>
                  <span>Low</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5FD08A]" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E0A84B]" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#EF6B6B]" />
                  <span>High</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Slot Matrix Area */}
        <div
          ref={containerRef}
          className="relative min-h-[320px] w-full rounded-lg glass-recessed border border-white/[0.04] p-2 flex items-center justify-center cursor-pointer overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoveredSlot(null)}
            onPointerDown={handlePointerDown}
            className="w-full h-[320px] block"
          />

          {/* Hover Tooltip */}
          {hoveredSlot && !selectedSlot && (
            <div
              className="fixed pointer-events-none z-50 rounded-lg glass-g1 p-2.5 border border-white/[0.14] shadow-2xl backdrop-blur-md text-xs font-ui space-y-1"
              style={{
                left: hoveredSlot.screenX + 12,
                top: hoveredSlot.screenY + 12,
              }}
            >
              <div className="font-semibold text-text-1 flex items-center justify-between gap-3">
                <span>Slot S{hoveredSlot.slot.slotId}</span>
                <span className="text-[10px] text-text-3">{hoveredSlot.slot.zoneName}</span>
              </div>
              <div className="flex items-center gap-2 text-text-2">
                <span className="text-text-3">Utilisation:</span>
                <span className="font-data font-semibold text-gold">
                  {hoveredSlot.slot.utilisationPct}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-2">
                <span className="text-text-3">Mean Dwell:</span>
                <span className="font-data text-text-1">
                  {Math.round(hoveredSlot.slot.meanDwellMinutes)} min
                </span>
              </div>
              {hoveredSlot.slot.suspectFault && (
                <div className="text-[10px] text-red flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Suspect {hoveredSlot.slot.suspectFault} fault</span>
                </div>
              )}
            </div>
          )}

          {/* Click Popover: Sparkline & Health Audit */}
          {selectedSlot && (
            <div className="absolute inset-x-4 top-4 max-w-sm mx-auto z-50 rounded-xl glass-g1 border border-white/[0.16] shadow-2xl p-4 text-xs font-ui space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display font-medium text-base text-text-1">
                    Slot S{selectedSlot.slotId}
                  </span>
                  <span className="text-[10px] text-text-3 font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                    {selectedSlot.zoneName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="p-1 rounded-full hover:bg-white/[0.08] text-text-3 hover:text-text-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bay Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg glass-g2">
                  <span className="text-[10px] text-text-3 block">Utilisation</span>
                  <span className="font-data font-semibold text-gold">
                    {selectedSlot.utilisationPct}%
                  </span>
                </div>
                <div className="p-2 rounded-lg glass-g2">
                  <span className="text-[10px] text-text-3 block">Sessions</span>
                  <span className="font-data font-semibold text-text-1">
                    {selectedSlot.sessionCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg glass-g2">
                  <span className="text-[10px] text-text-3 block">Mean Dwell</span>
                  <span className="font-data font-semibold text-text-1">
                    {Math.round(selectedSlot.meanDwellMinutes)}m
                  </span>
                </div>
              </div>

              {/* 30-Day Occupied Minutes Sparkline */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-text-3">
                  <span>Daily Occupancy Activity</span>
                  <span>{selectedSlot.dailyOccupiedMinutes.length} days</span>
                </div>
                <div className="h-12 w-full flex items-end gap-0.5 pt-1">
                  {selectedSlot.dailyOccupiedMinutes.map((mins, idx) => {
                    const maxMins = 1440; // 24 hours
                    const hPct = Math.min(100, Math.max(5, (mins / maxMins) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-gold/70 hover:bg-gold rounded-t-sm transition-all"
                        style={{ height: `${hPct}%` }}
                        title={`Day ${idx + 1}: ${mins} min occupied`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Hardware Health Status */}
              <div className="p-2 rounded-lg glass-recessed border border-white/[0.04] flex items-center justify-between text-[11px]">
                <span className="text-text-3">Sensor Health:</span>
                {selectedSlot.suspectFault ? (
                  <span className="flex items-center gap-1.5 text-red font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Suspect {selectedSlot.suspectFault}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-green font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Healthy (HC-SR04 Active)</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartCardShell>
  );
};
