import React, { useRef, useEffect, useState } from 'react';
import { useSimStore } from '@/store';
import {
  PIXELS_PER_STRIP,
  SLOTS_PER_STRIP,
  RgbColor,
} from '@/engine';
import { Card } from './Card';
import { Badge } from './Badge';
import { Play } from 'lucide-react';

export interface LedStripProps {
  showControls?: boolean;
  className?: string;
  title?: string;
}

export const LedStrip: React.FC<LedStripProps> = ({
  showControls = true,
  className = '',
  title = 'WS2812 Addressable LED Strips (Hardware Twin)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { state, updateConfig, triggerSweep } = useSimStore();
  const isBlocking = state.config.blockingSweep !== false;

  const [containerWidth, setContainerWidth] = useState(900);

  // ResizeObserver to handle responsive canvas widths
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 200) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // requestAnimationFrame Canvas Render Loop (Zero React State Re-renders)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const simState = useSimStore.getState().state;
      const ledFrame = simState.ledFrame;
      const slots = simState.slots;

      // Handle Device Pixel Ratio for crisp retina rendering
      const dpr = window.devicePixelRatio || 1;
      const width = containerWidth;
      // Height layout
      const rulerHeight = 24;
      const stripHeight = 16;
      const stripGap = 32;
      const bracketHeight = 22;
      const totalHeight = rulerHeight + (stripHeight + bracketHeight + stripGap) * 2 + 10;

      if (canvas.width !== width * dpr || canvas.height !== totalHeight * dpr) {
        canvas.width = width * dpr;
        canvas.height = totalHeight * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${totalHeight}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear canvas with recessed tray dark base
      ctx.fillStyle = '#0F0D0B';
      ctx.fillRect(0, 0, width, totalHeight);

      // Geometry calculations
      const labelWidth = 110;
      const paddingRight = 20;
      const stripWidth = Math.max(100, width - labelWidth - paddingRight);
      const pixelWidth = stripWidth / PIXELS_PER_STRIP;
      const startX = labelWidth;

      // =====================================================================
      // 1. Top Ruler (Pixel Indices 0 .. 99)
      // =====================================================================
      const rulerY = 16;
      ctx.fillStyle = '#A99F92';
      ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Major tick marks at 0, 25, 50, 75, 99
      const majorTicks = [0, 25, 50, 75, 99];
      for (let i = 0; i < PIXELS_PER_STRIP; i++) {
        const pxX = startX + i * pixelWidth + pixelWidth / 2;
        const isMajor = majorTicks.includes(i);
        const isMinor = i % 5 === 0;

        if (isMajor) {
          ctx.strokeStyle = '#E0A84B';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pxX, rulerY);
          ctx.lineTo(pxX, rulerY + 6);
          ctx.stroke();

          ctx.fillStyle = '#E0A84B';
          ctx.fillText(`px ${i}`, pxX, rulerY - 2);
        } else if (isMinor) {
          ctx.strokeStyle = 'rgba(46, 40, 35, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pxX, rulerY + 2);
          ctx.lineTo(pxX, rulerY + 6);
          ctx.stroke();
        }
      }

      // =====================================================================
      // 2. Render Strips (Strip 1 = Lane 0, Strip 2 = Lane 1)
      // =====================================================================
      const renderSingleStrip = (
        stripIdx: 0 | 1,
        y: number,
        stripName: string,
        gpioPin: string,
      ) => {
        const pixels = ledFrame[stripIdx] ?? [];
        const slotOffset = stripIdx * SLOTS_PER_STRIP; // S1-S4 (offset 0) or S5-S8 (offset 4)

        // Strip Header Label
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '600 11px "Hanken Grotesk", system-ui, sans-serif';
        ctx.fillStyle = stripIdx === 0 ? '#E0A84B' : '#6FB8D6';
        ctx.fillText(stripName, 12, y + stripHeight / 2 - 5);

        ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
        ctx.fillStyle = '#A99F92';
        ctx.fillText(`GPIO ${gpioPin}`, 12, y + stripHeight / 2 + 8);

        // Strip PCB Channel Track
        ctx.fillStyle = '#151210';
        ctx.strokeStyle = 'rgba(46, 40, 35, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(startX - 2, y - 2, stripWidth + 4, stripHeight + 4, 4);
        ctx.fill();
        ctx.stroke();

        // 25-Pixel Zone Brackets (S1-S4 or S5-S8)
        for (let z = 0; z < SLOTS_PER_STRIP; z++) {
          const zoneSlotIdx = slotOffset + z;
          const slot = slots[zoneSlotIdx];
          const zoneStartX = startX + z * 25 * pixelWidth;
          const zoneWidth = 25 * pixelWidth;
          const zoneEndX = zoneStartX + zoneWidth;

          const isOccupied = slot?.occupied ?? false;
          const isTarget = slot?.isTarget ?? false;

          const zoneColor = isTarget ? '#E0A84B' : isOccupied ? '#EF6B6B' : '#5FD08A';

          // Bracket Line above/below strip
          const bracketY = y + stripHeight + 4;
          ctx.strokeStyle = zoneColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Bracket left tick
          ctx.moveTo(zoneStartX + 1, bracketY + 4);
          ctx.lineTo(zoneStartX + 1, bracketY + 1);
          // Bracket horizontal line
          ctx.lineTo(zoneEndX - 1, bracketY + 1);
          // Bracket right tick
          ctx.lineTo(zoneEndX - 1, bracketY + 4);
          ctx.stroke();

          // Zone Bracket Label: S{idx} (px start-end)
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
          ctx.fillStyle = zoneColor;

          const statusBadge = isTarget ? '★ TARGET' : isOccupied ? 'OCCUPIED' : 'VACANT';
          ctx.fillText(
            `S${zoneSlotIdx + 1} [px ${z * 25}–${z * 25 + 24}] • ${statusBadge}`,
            zoneStartX + zoneWidth / 2,
            bracketY + 5,
          );
        }

        // Draw Individual 100 Pixels with WS2812 Die & Glow
        // STRICT FIRMWARE COLORS PRESERVED: (255,0,0), (0,255,0), (0,200,0), (0,0,0)
        for (let p = 0; p < PIXELS_PER_STRIP; p++) {
          const color: RgbColor = pixels[p] ?? { r: 0, g: 0, b: 0 };
          const pxX = startX + p * pixelWidth;
          const pxY = y;
          const pad = Math.max(0.5, pixelWidth * 0.12);
          const drawW = pixelWidth - pad * 2;
          const drawH = stripHeight;

          const isOff = color.r === 0 && color.g === 0 && color.b === 0;
          const isBright = color.g === 255 || color.r === 255;

          // Glowing Halo for active bright pixels (Bright green sweep / flash)
          if (isBright && !isOff) {
            ctx.save();
            ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
            ctx.fillRect(pxX + pad, pxY, drawW, drawH);
            ctx.restore();
          }

          // Core Pixel Body
          if (isOff) {
            ctx.fillStyle = '#1C1815';
          } else {
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          }
          ctx.beginPath();
          ctx.roundRect(pxX + pad, pxY, drawW, drawH, 2);
          ctx.fill();

          // SMD LED package boundary highlight
          ctx.strokeStyle = isOff ? 'rgba(46, 40, 35, 0.7)' : 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Pixel center phosphor dot
          if (!isOff) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(pxX + pixelWidth / 2 - 0.75, pxY + drawH / 2 - 0.75, 1.5, 1.5);
          }
        }
      };

      // Strip 1: Lane 0 (Upper row S1-S4)
      const strip1Y = rulerY + 12;
      renderSingleStrip(0, strip1Y, 'Strip 1 (Lane 0)', '23');

      // Strip 2: Lane 1 (Lower row S5-S8)
      const strip2Y = strip1Y + stripHeight + bracketHeight + stripGap;
      renderSingleStrip(1, strip2Y, 'Strip 2 (Lane 1)', '15');

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [containerWidth]);

  return (
    <Card className={`space-y-4 ${className}`} padding="lg">
      {/* Component Header with Firmware vs Improved Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-1">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green animate-pulse shrink-0" />
          <div>
            <h3 className="text-card-title text-text">
              {title}
            </h3>
            <p className="text-xs text-text-2 font-ui mt-1">
              2 × 100px WS2812 canvas rendered at 60 FPS via requestAnimationFrame with physical blocking behavior.
            </p>
          </div>
        </div>

        {/* Sweep Controls: Toggle + Replay Sweep Button */}
        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => triggerSweep()}
              disabled={state.sweep !== null}
              className="px-3.5 py-1.5 rounded-pill glass-g3 glass-tint-green hover:scale-[1.02] active:scale-[0.96] disabled:opacity-40 text-xs font-ui font-semibold text-green flex items-center gap-1.5 transition-all"
              title="Replays the sequential LED guidance sweep toward current target slot"
            >
              <Play className="w-3.5 h-3.5 fill-green" />
              <span>{state.sweep !== null ? 'Sweeping...' : 'Replay Sweep'}</span>
            </button>

            <span className="text-caption">Sweep architecture:</span>
            <div className="flex items-center glass-recessed p-1 rounded-pill border border-border-recessed font-ui text-xs">
              <button
                type="button"
                onClick={() => updateConfig({ blockingSweep: true })}
                className={`px-3 py-1 rounded-pill text-xs transition-all font-semibold ${
                  isBlocking
                    ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-glass-g3'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Firmware (Blocking)
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ blockingSweep: false })}
                className={`px-3 py-1 rounded-pill text-xs transition-all font-semibold ${
                  !isBlocking
                    ? 'glass-g3 glass-tint-info text-info font-semibold shadow-glass-g3'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Improved (Non-Blocking)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode Clarification Alert Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-inner-card glass-g2 border border-border-2 text-xs font-ui">
        <div className="flex items-center gap-2 text-text">
          <Badge variant={isBlocking ? 'gold' : 'info'} size="xs">
            {isBlocking ? 'BLOCKING DELAY(15)' : 'ASYNC NON-BLOCKING'}
          </Badge>
          <span className="text-text-2">
            {isBlocking
              ? 'Firmware Mode: 15ms/pixel sequential sweep blocks microcontroller loop (sensors not sampled during sweep).'
              : 'Improved Mode: Non-blocking sweep allows simultaneous ultrasonic sampling during LED animations.'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-muted text-xs">
          <span>Red Preservation: <strong className="text-red font-semibold">Active</strong></span>
          <span>•</span>
          <span>Blink Interval: <strong className="text-gold font-semibold font-data tabular-nums">300ms</strong></span>
        </div>
      </div>

      {/* HTML5 Canvas Container (Recessed Tray) */}
      <div ref={containerRef} className="w-full overflow-x-auto rounded-inner-card border border-border-recessed glass-recessed p-3">
        <canvas ref={canvasRef} className="block mx-auto rounded" />
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs font-ui text-text-2 border-t border-border-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red shadow-glass-g3" />
            <span>Solid Red (Occupied Zone)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00C800]" />
            <span>Dim Green (Vacant Base)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00FF00] shadow-glass-g3" />
            <span>Bright Green (15ms/px Sweep & Blink Target)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#0E0C0A] border border-border-3" />
            <span>Black (Blink Off Phase)</span>
          </div>
        </div>

        <span className="text-text-3">2 Strips × 100 Pixels = 200 Addressable RGB Nodes</span>
      </div>
    </Card>
  );
};
