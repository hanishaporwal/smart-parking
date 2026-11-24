import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChartCardShell } from './ChartCardShell';
import { SimulationAggregates } from '@/analytics/types';
import { calcHeatmapMeans } from '@/analytics/math';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface DemandHeatmapChartProps {
  aggregates: SimulationAggregates;
}

export const DemandHeatmapChart: React.FC<DemandHeatmapChartProps> = ({
  aggregates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredCell, setHoveredCell] = useState<{
    dow: number;
    hour: number;
    val: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const matrix =
    aggregates?.dowHourOccupancyMatrix ?? Array.from({ length: 7 }, () => Array(24).fill(0));
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const analysis = useMemo(() => {
    return calcHeatmapMeans(matrix);
  }, [matrix]);

  // Color interpolator: Background -> Green -> Gold -> Red
  const getColor = (val: number): string => {
    if (val <= 0.02) return '#1A1714';
    if (val < 0.40) {
      // Green scale (quiet to normal)
      const t = val / 0.40;
      const r = Math.round(26 + t * (95 - 26));
      const g = Math.round(23 + t * (208 - 23));
      const b = Math.round(20 + t * (138 - 20));
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (val < 0.75) {
      // Green to Gold (busy)
      const t = (val - 0.40) / 0.35;
      const r = Math.round(95 + t * (224 - 95));
      const g = Math.round(208 + t * (168 - 208));
      const b = Math.round(138 + t * (75 - 138));
      return `rgb(${r}, ${g}, ${b})`;
    }
    // Gold to Red (congested)
    const t = Math.min(1, (val - 0.75) / 0.25);
    const r = Math.round(224 + t * (239 - 224));
    const g = Math.round(168 + t * (107 - 168));
    const b = Math.round(75 + t * (107 - 75));
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Render on canvas
  useEffect(() => {
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

    const leftMargin = 38;
    const topMargin = 22;
    const rightMargin = 34; // for row totals
    const bottomMargin = 24; // for col totals

    const gridW = width - leftMargin - rightMargin;
    const gridH = height - topMargin - bottomMargin;

    const cellW = gridW / 24;
    const cellH = gridH / 7;

    // 1. Draw Hour Headers
    ctx.fillStyle = '#A99F92';
    ctx.font = '10px Hanken Grotesk, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let h = 0; h < 24; h += 3) {
      const x = leftMargin + h * cellW + cellW / 2;
      ctx.fillText(`${h}h`, x, topMargin - 4);
    }

    // Header for row totals
    ctx.textAlign = 'right';
    ctx.fillText('Avg', width - 4, topMargin - 4);

    // 2. Draw Day Rows and Cells
    for (let r = 0; r < 7; r++) {
      const y = topMargin + r * cellH;

      // Day Label
      ctx.fillStyle = '#D2C8BB';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(dowNames[r], leftMargin - 6, y + cellH / 2);

      for (let c = 0; c < 24; c++) {
        const x = leftMargin + c * cellW;
        const val = matrix[r][c];

        ctx.fillStyle = getColor(val);
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        // Highlight Busiest Cell
        if (analysis.busiestCell.dow === r && analysis.busiestCell.hour === c) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
        }

        // Print text value inside cells on larger displays
        if (cellW >= 18 && cellH >= 18) {
          ctx.fillStyle = val > 0.6 ? '#1C1815' : '#F6F0E8';
          ctx.font = '9px IBM Plex Mono, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(val * 100)}`, x + cellW / 2, y + cellH / 2);
        }
      }

      // Row Average
      ctx.fillStyle = '#E0A84B';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(analysis.rowMeans[r] * 100)}%`, width - 4, y + cellH / 2);
    }

    // 3. Draw Column Averages (bottom)
    ctx.fillStyle = '#A99F92';
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < 24; c += 3) {
      const x = leftMargin + c * cellW + cellW / 2;
      ctx.fillText(`${Math.round(analysis.colMeans[c] * 100)}%`, x, height - bottomMargin + 6);
    }
  }, [matrix, analysis]);

  // Pointer hover interactions
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const leftMargin = 38;
    const topMargin = 22;
    const rightMargin = 34;
    const bottomMargin = 24;

    const gridW = rect.width - leftMargin - rightMargin;
    const gridH = rect.height - topMargin - bottomMargin;

    if (x >= leftMargin && x < leftMargin + gridW && y >= topMargin && y < topMargin + gridH) {
      const c = Math.floor(((x - leftMargin) / gridW) * 24);
      const r = Math.floor(((y - topMargin) / gridH) * 7);
      if (r >= 0 && r < 7 && c >= 0 && c < 24) {
        setHoveredCell({
          dow: r,
          hour: c,
          val: matrix[r][c],
          screenX: e.clientX,
          screenY: e.clientY,
        });
        return;
      }
    }
    setHoveredCell(null);
  };

  const busiestDay = dowNames[analysis.busiestCell.dow];
  const busiestHour = `${String(analysis.busiestCell.hour).padStart(2, '0')}:00`;
  const busiestPct = Math.round(analysis.busiestCell.val * 100);

  const soWhatSentence = `Facility demand concentrates most heavily on ${busiestDay} at ${busiestHour} (${busiestPct}% mean occupancy), with overall lot baseline at ${Math.round(analysis.grandMean * 100)}%. Operators can schedule preventive sensor cleaning during early weekday mornings.`;

  // Accessible Table Representation
  const tableContent = (
    <table className="w-full text-left text-xs font-ui">
      <thead>
        <tr className="border-b border-white/[0.1] text-text-3">
          <th className="py-2 px-3 font-medium">Day</th>
          {Array.from({ length: 8 }).map((_, i) => (
            <th key={i} className="py-2 px-2 font-medium font-data text-right">
              {i * 3}:00
            </th>
          ))}
          <th className="py-2 px-3 font-medium text-right text-gold">Day Avg</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {matrix.map((row, r) => (
          <tr key={r} className="hover:bg-white/[0.02]">
            <td className="py-1.5 px-3 font-medium text-text-1">{dowNames[r]}</td>
            {Array.from({ length: 8 }).map((_, i) => (
              <td key={i} className="py-1.5 px-2 font-data text-right text-text-2">
                {Math.round(row[i * 3] * 100)}%
              </td>
            ))}
            <td className="py-1.5 px-3 font-data text-right font-semibold text-gold">
              {Math.round(analysis.rowMeans[r] * 100)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.peakHours.title}
      whatItTells={ANALYTICS_COPY.peakHours.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12 lg:col-span-4"
      headerActions={
        <div className="flex items-center gap-1.5 text-[11px] text-text-3 font-ui">
          <span>&lt;20%</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-[#5FD08A]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#E0A84B]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#EF6B6B]" />
          <span>&gt;80%</span>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="relative h-[300px] w-full flex items-center justify-center cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredCell(null)}
          className="w-full h-full block"
        />

        {/* Hover Tooltip */}
        {hoveredCell && (
          <div
            className="fixed pointer-events-none z-50 rounded-lg glass-g1 p-2.5 border border-white/[0.14] shadow-2xl backdrop-blur-md text-xs font-ui space-y-1"
            style={{
              left: hoveredCell.screenX + 12,
              top: hoveredCell.screenY + 12,
            }}
          >
            <div className="font-semibold text-text-1">
              {dowNames[hoveredCell.dow]} at {String(hoveredCell.hour).padStart(2, '0')}:00
            </div>
            <div className="flex items-center gap-2 text-text-2">
              <span className="text-text-3">Mean Occupancy:</span>
              <span className="font-data font-semibold text-gold">
                {Math.round(hoveredCell.val * 1000) / 10}%
              </span>
            </div>
            <div className="text-[10px] text-text-3">
              Sampled across {aggregates.rangeDays} calendar days
            </div>
          </div>
        )}
      </div>
    </ChartCardShell>
  );
};
