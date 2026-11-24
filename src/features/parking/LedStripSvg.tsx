import React, { useEffect, useState } from 'react';
import { LedFrame, RgbColor, COLOR_RED, COLOR_GREEN, COLOR_OFF } from '@/engine';
import { useFxStore } from '@/scenarios/fx';
import { useSimStore } from '@/store';

export interface LedStripSvgProps {
  ledFrame: LedFrame;
  startX: number;
  lane0Y: number;
  lane1Y: number;
  totalWidth: number;
  slotWidth?: number;
  slotGap?: number;
  ignoreFxStore?: boolean;
}

function rgbToCss(c: RgbColor, alpha = 1): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

export const LedStripSvg: React.FC<LedStripSvgProps> = React.memo(
  ({
    ledFrame,
    startX,
    lane0Y,
    lane1Y,
    totalWidth: _totalWidth,
    slotWidth = 190,
    slotGap = 0,
    ignoreFxStore = false,
  }) => {
    const ledVisualState = useFxStore(s => s.ledVisualState);
    const slots = useSimStore(s => s.state.slots);
    const [blinkOn, setBlinkOn] = useState(true);

    useEffect(() => {
      const interval = setInterval(() => {
        setBlinkOn(b => !b);
      }, 300);
      return () => clearInterval(interval);
    }, []);

    const renderStrip = (stripIndex: 0 | 1, y: number) => {
      const pixels = ledFrame[stripIndex] ?? [];
      const pixelSpacing = slotWidth / 25;

      return (
        <g id={`led-strip-${stripIndex}`}>
          {/* Per-Slot WS2812 Segment Tracks: 4 independent segments per row (one per slot) */}
          {[0, 1, 2, 3].map((col) => {
            const segStartX = startX + col * (slotWidth + slotGap);
            return (
              <rect
                key={`seg-track-${stripIndex}-${col}`}
                x={segStartX + 1}
                y={y - 3.5}
                width={slotWidth - 2}
                height={7}
                rx={2.5}
                fill="#151210"
                stroke="rgba(46, 40, 35, 0.7)"
                strokeWidth={0.75}
              />
            );
          })}

          {/* Individual WS2812 Pixel Nodes (Aligned exactly with each slot bay) */}
          {pixels.map((defaultColor, idx) => {
            const slotIdxInLane = Math.floor(idx / 25);
            const globalSlotIdx = stripIndex * 4 + slotIdxInLane;
            const slotState = slots[globalSlotIdx];

            let color = defaultColor;

            if (!ignoreFxStore && slotState) {
              const isOcc = slotState.occupied;
              const isTarget = !isOcc && (slotState.isTarget || ledVisualState.blinkingSlot === globalSlotIdx);
              if (isOcc) {
                color = COLOR_RED;
              } else if (isTarget) {
                color = blinkOn ? COLOR_GREEN : COLOR_OFF;
              } else {
                color = COLOR_OFF;
              }
            }

            const p = idx % 25;
            const slotStartX = startX + slotIdxInLane * (slotWidth + slotGap);
            const pxX = slotStartX + p * pixelSpacing + pixelSpacing / 2;
            const isBright = color.g === 255 || color.r === 255;
            const isOff = color.r === 0 && color.g === 0 && color.b === 0;

            return (
              <g key={idx}>
                {/* Glow ring for active bright pixels */}
                {isBright && !isOff && (
                  <circle
                    cx={pxX}
                    cy={y}
                    r={pixelSpacing * 0.75}
                    fill={rgbToCss(color, 0.35)}
                  />
                )}
                {/* Core pixel LED node */}
                <circle
                  cx={pxX}
                  cy={y}
                  r={isOff ? 1 : isBright ? 2.2 : 1.6}
                  fill={rgbToCss(color)}
                  stroke={isOff ? 'rgba(46, 40, 35, 0.7)' : 'rgba(255,255,255,0.4)'}
                  strokeWidth={0.4}
                />
              </g>
            );
          })}
        </g>
      );
    };

    return (
      <g id="led-strips-layer">
        {renderStrip(0, lane0Y)}
        {renderStrip(1, lane1Y)}
      </g>
    );
  },
);

LedStripSvg.displayName = 'LedStripSvg';
