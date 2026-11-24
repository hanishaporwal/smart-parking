import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { Clock, Hourglass, Zap, AlertCircle } from 'lucide-react';
import { ChartCardShell } from './ChartCardShell';
import { ChartGlassTooltip } from './ChartGlassTooltip';
import { SimulationAggregates } from '@/analytics/types';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface DwellTurnoverChartProps {
  aggregates: SimulationAggregates;
}

export const DwellTurnoverChart: React.FC<DwellTurnoverChartProps> = ({
  aggregates,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const dwellBins = aggregates?.dwellHistogramBins ?? [];
  const shortPct = aggregates?.shortStayPct ?? 0;
  const medPct = aggregates?.mediumStayPct ?? 0;
  const longPct = aggregates?.longStayPct ?? 0;
  const overstayHours = aggregates?.slotHoursLostToOverstay ?? 0;

  // Turnover timeseries across the 168 hours of the week
  const turnoverData = useMemo(() => {
    return (aggregates?.turnoverByDOWHour ?? []).map((pt, idx) => ({
      index: idx,
      label: `${pt.dayLabel} ${pt.hourLabel}`,
      day: pt.dayLabel,
      hour: pt.hour,
      turnover: Math.round(pt.turnoverPerSlotDay * 100) / 100,
    }));
  }, [aggregates?.turnoverByDOWHour]);

  // Peak turnover hour
  const peakTurnover = useMemo(() => {
    if (turnoverData.length === 0) return null;
    let peak = turnoverData[0];
    for (let i = 1; i < turnoverData.length; i++) {
      if (turnoverData[i].turnover > peak.turnover) {
        peak = turnoverData[i];
      }
    }
    return peak;
  }, [turnoverData]);

  const soWhatSentence = useMemo(() => {
    return `${shortPct}% of visitors complete short stays under 30 minutes, while ${longPct}% remain parked over 4 hours. Peak turnover reaches ${peakTurnover?.turnover || 3.2} sessions/bay/day on ${peakTurnover?.label || 'Saturday afternoon'}. Overstay vehicles consumed ${Math.round(overstayHours).toLocaleString()} slot-hours, indicating potential for active enforcement alerts.`;
  }, [shortPct, longPct, peakTurnover, overstayHours]);

  // Accessible Table Representation
  const tableContent = (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Dwell Duration Histogram (Log-Spaced Intervals)
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Duration Bin</th>
              <th className="py-2 px-3 font-medium">Min Mins</th>
              <th className="py-2 px-3 font-medium">Max Mins</th>
              <th className="py-2 px-3 font-medium text-right text-gold">Session Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {dwellBins.map(bin => (
              <tr key={bin.label} className="hover:bg-white/[0.02]">
                <td className="py-1.5 px-3 font-medium text-text-1">{bin.label}</td>
                <td className="py-1.5 px-3 font-data text-text-3">{bin.minDwell}m</td>
                <td className="py-1.5 px-3 font-data text-text-3">{bin.maxDwell}m</td>
                <td className="py-1.5 px-3 font-data text-right font-semibold text-gold">
                  {bin.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gold mb-2 font-ui">
          Turnover Rates by Day of Week
        </h4>
        <table className="w-full text-left text-xs font-ui">
          <thead>
            <tr className="border-b border-white/[0.1] text-text-3">
              <th className="py-2 px-3 font-medium">Time / Day</th>
              <th className="py-2 px-3 font-medium text-right text-gold">Turnover (Sessions/Bay/Day)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {turnoverData
              .filter((_, idx) => idx % 8 === 0)
              .map(row => (
                <tr key={row.index} className="hover:bg-white/[0.02]">
                  <td className="py-1.5 px-3 font-medium text-text-1">{row.label}</td>
                  <td className="py-1.5 px-3 font-data text-right text-gold">{row.turnover}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.parkingDuration.title}
      whatItTells={ANALYTICS_COPY.parkingDuration.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12"
      headerActions={
        <div className="flex items-center gap-1.5 text-xs font-ui">
          <span className="px-2 py-0.5 rounded-pill bg-white/[0.04] border border-white/[0.06] text-text-3">
            {ANALYTICS_COPY.inner.limitBadge}
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (5 cols): Dwell Histogram & Short/Medium/Long Split */}
        <div className="lg:col-span-5 space-y-4">
          {/* Split Summary Badges */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-ui">
            <div className="p-2.5 rounded-lg glass-g2 border border-white/[0.06]">
              <span className="text-[10.5px] text-text-3 block flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-green" /> {ANALYTICS_COPY.inner.shortStay}
              </span>
              <span className="font-data font-semibold text-sm sm:text-base text-green">
                {shortPct}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg glass-g2 border border-white/[0.06]">
              <span className="text-[10.5px] text-text-3 block flex items-center justify-center gap-1">
                <Hourglass className="w-3 h-3 text-gold" /> {ANALYTICS_COPY.inner.mediumStay}
              </span>
              <span className="font-data font-semibold text-sm sm:text-base text-gold">
                {medPct}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg glass-g2 border border-white/[0.06]">
              <span className="text-[10.5px] text-text-3 block flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3 text-info" /> {ANALYTICS_COPY.inner.longStay}
              </span>
              <span className="font-data font-semibold text-sm sm:text-base text-info">
                {longPct}%
              </span>
            </div>
          </div>

          {/* Dwell Histogram Chart */}
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dwellBins}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 10 }}
                />
                <YAxis
                  stroke="#5A5048"
                  tick={{ fill: '#A99F92', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <ChartGlassTooltip
                        active={active}
                        label={`Dwell Bin: ${d.label}`}
                        customRows={[
                          { label: 'Sessions', value: d.count.toLocaleString(), color: '#E0A84B' },
                          { label: 'Span', value: `${d.minDwell}m - ${d.maxDwell}m` },
                        ]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Sessions"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={!shouldReduceMotion}
                >
                  {dwellBins.map((bin, index) => {
                    const color =
                      bin.maxDwell <= 30
                        ? '#5FD08A'
                        : bin.minDwell >= 240
                        ? '#6FB8D6'
                        : '#E0A84B';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (7 cols): Weekly Turnover Line Chart & Overstay KPI */}
        <div className="lg:col-span-7 space-y-4">
          {/* Overstay KPI Banner */}
          <div className="p-3 rounded-lg glass-g2 border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red/10 text-red shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-ui font-semibold text-text-1">
                  {ANALYTICS_COPY.inner.overstayLoss}
                </span>
                <span className="text-[11px] text-text-3 font-ui block">
                  Cumulative bay time blocked by vehicles exceeding facility duration limits
                </span>
              </div>
            </div>
            <span className="font-data font-semibold text-lg sm:text-xl text-red">
              {Math.round(overstayHours).toLocaleString()}{' '}
              <span className="text-xs font-ui text-text-3 font-normal">hrs</span>
            </span>
          </div>

          {/* Turnover Velocity Line Chart */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-ui px-1">
              <span className="font-semibold text-text-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gold" />
                <span>Turnover Velocity (Sessions per Bay per Day)</span>
              </span>
              {peakTurnover && (
                <span className="text-[11px] text-text-3 font-data">
                  Peak: <span className="text-gold font-semibold">{peakTurnover.turnover}</span> ({peakTurnover.label})
                </span>
              )}
            </div>

            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={turnoverData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    stroke="#5A5048"
                    tick={{ fill: '#A99F92', fontSize: 10 }}
                    interval={23}
                  />
                  <YAxis
                    stroke="#5A5048"
                    tick={{ fill: '#A99F92', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const d = payload[0].payload;
                      return (
                        <ChartGlassTooltip
                          active={active}
                          label={d.label}
                          customRows={[
                            {
                              label: 'Turnover Rate',
                              value: `${d.turnover} sessions/bay/day`,
                              color: '#E0A84B',
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="turnover"
                    name="Turnover"
                    stroke="#E0A84B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={!shouldReduceMotion}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ChartCardShell>
  );
};
