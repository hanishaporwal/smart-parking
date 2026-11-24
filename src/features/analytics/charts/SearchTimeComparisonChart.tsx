import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ChartCardShell } from './ChartCardShell';
import { ChartGlassTooltip } from './ChartGlassTooltip';
import { SimulationAggregates } from '@/analytics/types';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface SearchTimeComparisonChartProps {
  aggregates: SimulationAggregates;
}

export const SearchTimeComparisonChart: React.FC<SearchTimeComparisonChartProps> = ({
  aggregates,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState<'all' | 'peak'>('all');

  const occupancyCurveData = useMemo(() => {
    return (aggregates?.searchTimeByOccupancy ?? []).map(item => {
      const reductionSec = Math.max(0, item.baselineSec - item.guidedSec);
      const reductionPct =
        item.baselineSec > 0 ? Math.round((reductionSec / item.baselineSec) * 100) : 0;
      return {
        ...item,
        reductionSec,
        reductionPct,
      };
    });
  }, [aggregates?.searchTimeByOccupancy]);

  // Reduction at 90% band
  const statAt90 = useMemo(() => {
    return (
      occupancyCurveData.find(d => d.band === '90-95%') ||
      occupancyCurveData[occupancyCurveData.length - 2] ||
      occupancyCurveData[occupancyCurveData.length - 1]
    );
  }, [occupancyCurveData]);

  // Histograms & percentiles based on viewMode
  const histogramData =
    (viewMode === 'peak'
      ? aggregates?.peakSearchTimeHistograms
      : aggregates?.searchTimeHistograms) ?? [];

  const percentiles =
    (viewMode === 'peak'
      ? aggregates?.searchTimePercentilesPeak
      : aggregates?.searchTimePercentilesAll) ?? {
      p50: 45,
      p90: 85,
      p99: 140,
      baselineP50: 120,
      baselineP90: 280,
      baselineP99: 450,
    };

  // Filter histogram for chart (e.g. up to 600s, grouping into 30s bins for clean rendering)
  const chartHistogram = useMemo(() => {
    // 10s bins up to 600s = 60 items
    return histogramData.filter(bin => bin.timeSec <= 600);
  }, [histogramData]);

  const soWhatSentence = useMemo(() => {
    const p90Guided = percentiles.p90;
    const p90Base = percentiles.baselineP90;
    const reduction90 = statAt90 ? statAt90.reductionPct : 62;
    return `At 90% occupancy, ParkWay reduces average search time by ${reduction90}% (${statAt90?.baselineSec || 280}s down to ${statAt90?.guidedSec || 95}s). 90% of guided drivers reach an empty slot within ${p90Guided}s compared to ${p90Base}s without guidance, preventing aisle circling gridlock.`;
  }, [percentiles, statAt90]);

  // Accessible Table Representation
  const tableContent = (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Mean Search Time by Occupancy Band (50% – 100%)
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Occupancy Band</th>
              <th className="py-2 px-3 font-medium text-red">Without Guidance (Baseline)</th>
              <th className="py-2 px-3 font-medium text-green">With ParkWay (Guided)</th>
              <th className="py-2 px-3 font-medium text-gold">Time Saved</th>
              <th className="py-2 px-3 font-medium text-right">Reduction %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {occupancyCurveData.map(row => (
              <tr key={row.band} className="hover:bg-white/[0.02]">
                <td className="py-1.5 px-3 font-medium text-text-1">{row.band}</td>
                <td className="py-1.5 px-3 font-data text-red">{row.baselineSec}s</td>
                <td className="py-1.5 px-3 font-data text-green">{row.guidedSec}s</td>
                <td className="py-1.5 px-3 font-data text-gold">{row.reductionSec}s</td>
                <td className="py-1.5 px-3 font-data text-right font-semibold text-text-1">
                  -{row.reductionPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Search Time Percentiles ({viewMode === 'peak' ? 'Peak Hours' : 'All Sessions'})
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Percentile</th>
              <th className="py-2 px-3 font-medium text-red">Baseline Search Time</th>
              <th className="py-2 px-3 font-medium text-green">Guided Search Time</th>
              <th className="py-2 px-3 font-medium text-right text-gold">Reduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            <tr>
              <td className="py-1.5 px-3 font-medium text-text-1">p50 (Median)</td>
              <td className="py-1.5 px-3 font-data text-red">{percentiles.baselineP50}s</td>
              <td className="py-1.5 px-3 font-data text-green">{percentiles.p50}s</td>
              <td className="py-1.5 px-3 font-data text-right text-gold">
                -{percentiles.baselineP50 - percentiles.p50}s (
                {Math.round(
                  ((percentiles.baselineP50 - percentiles.p50) / percentiles.baselineP50) * 100
                )}
                %)
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-3 font-medium text-text-1">p90 (Congested)</td>
              <td className="py-1.5 px-3 font-data text-red">{percentiles.baselineP90}s</td>
              <td className="py-1.5 px-3 font-data text-green">{percentiles.p90}s</td>
              <td className="py-1.5 px-3 font-data text-right text-gold">
                -{percentiles.baselineP90 - percentiles.p90}s (
                {Math.round(
                  ((percentiles.baselineP90 - percentiles.p90) / percentiles.baselineP90) * 100
                )}
                %)
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-3 font-medium text-text-1">p99 (Worst Case)</td>
              <td className="py-1.5 px-3 font-data text-red">{percentiles.baselineP99}s</td>
              <td className="py-1.5 px-3 font-data text-green">{percentiles.p99}s</td>
              <td className="py-1.5 px-3 font-data text-right text-gold">
                -{percentiles.baselineP99 - percentiles.p99}s (
                {Math.round(
                  ((percentiles.baselineP99 - percentiles.p99) / percentiles.baselineP99) * 100
                )}
                %)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.searchTime.title}
      whatItTells={ANALYTICS_COPY.searchTime.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12"
      headerActions={
        <div className="flex items-center p-0.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={clsx(
              'px-3 py-1 rounded-pill text-xs font-ui transition-colors',
              viewMode === 'all'
                ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                : 'text-text-3 hover:text-text-1'
            )}
          >
            All sessions
          </button>
          <button
            type="button"
            onClick={() => setViewMode('peak')}
            className={clsx(
              'px-3 py-1 rounded-pill text-xs font-ui transition-colors',
              viewMode === 'peak'
                ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                : 'text-text-3 hover:text-text-1'
            )}
          >
            Peak hours only
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Occupancy Band vs Search Time Curve */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-ui px-1">
            <span className="font-semibold text-text-1">{ANALYTICS_COPY.inner.timeByOccupancy}</span>
            {statAt90 && (
              <span className="text-[11px] text-gold font-data bg-gold/10 px-2 py-0.5 rounded-pill border border-gold/20">
                90% Occupancy: -{statAt90.reductionPct}% Search Time
              </span>
            )}
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={occupancyCurveData}
                margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="band"
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                />
                <YAxis
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                  tickFormatter={v => `${v}s`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <ChartGlassTooltip
                        active={active}
                        label={`Occupancy Band: ${d.band}`}
                        customRows={[
                          { label: 'Without Guidance', value: `${d.baselineSec}s`, color: '#EF6B6B' },
                          { label: 'With ParkWay', value: `${d.guidedSec}s`, color: '#5FD08A' },
                          { label: 'Reduction', value: `-${d.reductionPct}% (${d.reductionSec}s saved)`, color: '#E0A84B' },
                        ]}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="baselineSec"
                  name="Without Guidance"
                  stroke="#EF6B6B"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#EF6B6B' }}
                  isAnimationActive={!shouldReduceMotion}
                />
                <Line
                  type="monotone"
                  dataKey="guidedSec"
                  name="With ParkWay"
                  stroke="#5FD08A"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#5FD08A' }}
                  isAnimationActive={!shouldReduceMotion}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Overlaid Histograms & Percentile Markers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-ui px-1">
            <span className="font-semibold text-text-1">{ANALYTICS_COPY.inner.timeSpread}</span>
            <div className="flex items-center gap-3 text-[11px] text-text-3 font-ui">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#5FD08A]" /> Guided
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF6B6B]" /> Baseline
              </span>
            </div>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartHistogram}
                margin={{ top: 15, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="timeSec"
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                  tickFormatter={v => `${v}s`}
                  interval={5}
                />
                <YAxis
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <ChartGlassTooltip
                        active={active}
                        label={`Search Time: ${d.timeSec}s - ${d.timeSec + 10}s`}
                        customRows={[
                          { label: 'Guided Sessions', value: d.guidedCount, color: '#5FD08A' },
                          { label: 'Baseline Sessions', value: d.baselineCount, color: '#EF6B6B' },
                        ]}
                      />
                    );
                  }}
                />
                {/* Reference lines for guided p50, p90, p99 */}
                <ReferenceLine
                  x={percentiles.p50}
                  stroke="#5FD08A"
                  strokeDasharray="3 3"
                  label={{ value: `p50 (${percentiles.p50}s)`, fill: '#5FD08A', fontSize: 9, position: 'insideTopLeft' }}
                />
                <ReferenceLine
                  x={percentiles.p90}
                  stroke="#E0A84B"
                  strokeDasharray="3 3"
                  label={{ value: `p90 (${percentiles.p90}s)`, fill: '#E0A84B', fontSize: 9, position: 'insideTopLeft' }}
                />
                <ReferenceLine
                  x={percentiles.p99}
                  stroke="#EF6B6B"
                  strokeDasharray="3 3"
                  label={{ value: `p99 (${percentiles.p99}s)`, fill: '#EF6B6B', fontSize: 9, position: 'insideTopLeft' }}
                />

                <Bar
                  dataKey="baselineCount"
                  name="Baseline"
                  fill="#EF6B6B"
                  opacity={0.35}
                  isAnimationActive={!shouldReduceMotion}
                />
                <Bar
                  dataKey="guidedCount"
                  name="Guided"
                  fill="#5FD08A"
                  opacity={0.8}
                  isAnimationActive={!shouldReduceMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini Percentiles Comparison Summary */}
          <div className="grid grid-cols-3 gap-2 p-2 rounded-lg glass-recessed border border-white/[0.05] text-[11px] font-ui">
            <div className="text-center">
              <span className="text-text-3 block text-[10px]">p50 (Median)</span>
              <span className="font-data font-semibold text-green">{percentiles.p50}s</span>
              <span className="text-text-3 font-data block text-[9.5px]">
                vs {percentiles.baselineP50}s
              </span>
            </div>
            <div className="text-center border-x border-white/[0.06]">
              <span className="text-text-3 block text-[10px]">p90 (Congested)</span>
              <span className="font-data font-semibold text-gold">{percentiles.p90}s</span>
              <span className="text-text-3 font-data block text-[9.5px]">
                vs {percentiles.baselineP90}s
              </span>
            </div>
            <div className="text-center">
              <span className="text-text-3 block text-[10px]">p99 (Outliers)</span>
              <span className="font-data font-semibold text-red">{percentiles.p99}s</span>
              <span className="text-text-3 font-data block text-[9.5px]">
                vs {percentiles.baselineP99}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </ChartCardShell>
  );
};
