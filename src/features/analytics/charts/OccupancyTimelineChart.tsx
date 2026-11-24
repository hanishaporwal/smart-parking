import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Brush,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ChartCardShell } from './ChartCardShell';
import { ChartGlassTooltip } from './ChartGlassTooltip';
import { SimulationAggregates } from '@/analytics/types';
import { FACILITY_PRESETS } from '@/analytics/presets';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface OccupancyTimelineChartProps {
  aggregates: SimulationAggregates;
  zoneFilter: string;
}

type TimelineRange = '24h' | '7d' | '30d' | '90d';

export const OccupancyTimelineChart: React.FC<OccupancyTimelineChartProps> = ({
  aggregates,
  zoneFilter,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [rangeView, setRangeView] = useState<TimelineRange>('7d');

  const preset = FACILITY_PRESETS[aggregates.presetId];
  const totalSlots = aggregates.totalSlots;

  // Determine active zone index if filtered
  const activeZoneIndex =
    zoneFilter !== 'all' ? preset.zones.findIndex(z => z.id === zoneFilter) : -1;
  const activeZone = activeZoneIndex >= 0 ? preset.zones[activeZoneIndex] : null;
  const relevantSlots = activeZone ? activeZone.slotCount : totalSlots;

  // Transform hourly occupancy data
  const chartData = useMemo(() => {
    const totalHours = aggregates?.hourlyTotalOccupancy?.length ?? 0;

    // Filter slice based on rangeView
    let hoursToShow = 168; // default 7 days = 168h
    if (rangeView === '24h') hoursToShow = 24;
    else if (rangeView === '7d') hoursToShow = 168;
    else if (rangeView === '30d') hoursToShow = 720;
    else if (rangeView === '90d') hoursToShow = 2160;

    const startIndex = Math.max(0, totalHours - hoursToShow);
    const sliceTotalOccupancy = (aggregates?.hourlyTotalOccupancy ?? []).slice(startIndex);
    const sliceZoneOccupancy = (aggregates?.hourlyZoneOccupancy ?? []).slice(startIndex);
    const sliceArrivals = (aggregates?.hourlyArrivals ?? []).slice(startIndex);

    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return sliceTotalOccupancy.map((totalOcc, idx) => {
      const globalHour = startIndex + idx;
      const dayIndex = Math.floor(globalHour / 24);
      const hourOfDay = globalHour % 24;
      const dow = (dayIndex + 1) % 7;

      const occFraction =
        activeZoneIndex >= 0 && sliceZoneOccupancy[idx]
          ? sliceZoneOccupancy[idx][activeZoneIndex]
          : totalOcc;

      const occupancyPct = Math.round(occFraction * 1000) / 10;
      const occupiedSlots = Math.round(occFraction * relevantSlots);
      const freeSlots = Math.max(0, relevantSlots - occupiedSlots);
      const arrivals = sliceArrivals[idx] || 0;

      const timeLabel = `${dowNames[dow]} D${dayIndex + 1} ${String(hourOfDay).padStart(2, '0')}:00`;

      return {
        hourIndex: globalHour,
        label: timeLabel,
        occupancyPct,
        occupiedSlots,
        freeSlots,
        arrivals,
      };
    });
  }, [aggregates, rangeView, activeZoneIndex, relevantSlots]);

  // Find peak point in visible range
  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    let peak = chartData[0];
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].occupancyPct > peak.occupancyPct) {
        peak = chartData[i];
      }
    }
    return peak;
  }, [chartData]);

  // Dynamic Insight sentence
  const soWhatSentence = useMemo(() => {
    if (!peakPoint) return 'Gathering occupancy timeseries data.';
    const zoneName = activeZone ? `in ${activeZone.name}` : `across all ${totalSlots} bays`;
    return `Peak occupancy ${zoneName} reached ${peakPoint.occupancyPct}% at ${peakPoint.label} (${peakPoint.occupiedSlots} bays occupied, ${peakPoint.freeSlots} free). The automated light sweep prevents circling gridlock before lot saturation.`;
  }, [peakPoint, activeZone, totalSlots]);

  // Accessible Table Representation
  const tableContent = (
    <table className="w-full text-left text-xs font-ui">
      <thead>
        <tr className="border-b border-white/[0.1] text-text-3">
          <th className="py-2 px-3 font-medium">Time / Day</th>
          <th className="py-2 px-3 font-medium">Occupancy %</th>
          <th className="py-2 px-3 font-medium">Occupied Bays</th>
          <th className="py-2 px-3 font-medium">Free Bays</th>
          <th className="py-2 px-3 font-medium">Arrivals / hr</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {chartData.filter((_, idx) => idx % Math.max(1, Math.floor(chartData.length / 20)) === 0).map(row => (
          <tr key={row.hourIndex} className="hover:bg-white/[0.02]">
            <td className="py-1.5 px-3 font-medium text-text-1">{row.label}</td>
            <td className="py-1.5 px-3 font-data text-gold">{row.occupancyPct}%</td>
            <td className="py-1.5 px-3 font-data text-text-2">{row.occupiedSlots}</td>
            <td className="py-1.5 px-3 font-data text-green">{row.freeSlots}</td>
            <td className="py-1.5 px-3 font-data text-text-3">{row.arrivals}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.occupancy.title}
      whatItTells={ANALYTICS_COPY.occupancy.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12 lg:col-span-8"
      headerActions={
        <div className="flex items-center p-0.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
          {(['24h', '7d', '30d', '90d'] as TimelineRange[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeView(r)}
              className={clsx(
                'px-2.5 py-1 rounded-pill text-[11px] font-ui transition-colors font-data',
                rangeView === r
                  ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text-1'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E0A84B" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#E0A84B" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              stroke="#5A5048"
              tick={{ fill: '#A99F92', fontSize: 11 }}
              interval={Math.max(1, Math.floor(chartData.length / 7))}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#5A5048"
              tick={{ fill: '#A99F92', fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />

            {/* Threshold References: Warning (85%), Critical (95%), 100% capacity */}
            <ReferenceLine
              y={85}
              stroke="#E0A84B"
              strokeDasharray="3 3"
              label={{ value: '85% Warning', fill: '#E0A84B', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={95}
              stroke="#EF6B6B"
              strokeDasharray="3 3"
              label={{ value: '95% Critical', fill: '#EF6B6B', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={100}
              stroke="#EF6B6B"
              strokeWidth={1.5}
              label={{ value: 'Capacity', fill: '#EF6B6B', fontSize: 10, position: 'insideBottomRight' }}
            />

            {peakPoint && (
              <ReferenceDot
                x={peakPoint.label}
                y={peakPoint.occupancyPct}
                r={4}
                fill="#EF6B6B"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                label={{
                  value: `${peakPoint.label.split(' ')[0]} ${peakPoint.label.split(' ')[2] || ''} - ${peakPoint.occupancyPct}%`,
                  fill: '#F6F0E8',
                  fontSize: 10,
                  position: 'top',
                }}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0].payload;
                return (
                  <ChartGlassTooltip
                    active={active}
                    label={d.label}
                    customRows={[
                      { label: 'Occupancy', value: `${d.occupancyPct}%`, color: '#E0A84B' },
                      { label: 'Occupied Bays', value: d.occupiedSlots, color: '#EF6B6B' },
                      { label: 'Free Bays', value: d.freeSlots, color: '#5FD08A' },
                      { label: 'Arrivals / hr', value: d.arrivals, color: '#6FB8D6' },
                    ]}
                  />
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="occupancyPct"
              name="Occupancy %"
              stroke="#E0A84B"
              strokeWidth={2}
              fill="url(#occupancyGradient)"
              isAnimationActive={!shouldReduceMotion}
            />

            <Brush
              dataKey="label"
              height={22}
              stroke="#5A5048"
              fill="#1A1714"
              travellerWidth={10}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCardShell>
  );
};
