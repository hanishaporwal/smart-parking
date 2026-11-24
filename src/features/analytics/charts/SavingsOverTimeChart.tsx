import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ShieldCheck, UserX, IndianRupee } from 'lucide-react';
import { ChartCardShell } from './ChartCardShell';
import { ChartGlassTooltip } from './ChartGlassTooltip';
import { SimulationAggregates } from '@/analytics/types';
import { ANALYTICS_COPY } from '@/analytics/copy';

export interface SavingsOverTimeChartProps {
  aggregates: SimulationAggregates;
}

type SavingsMetric = 'fuel' | 'co2' | 'driverHours';

export const SavingsOverTimeChart: React.FC<SavingsOverTimeChartProps> = ({
  aggregates,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [activeMetric, setActiveMetric] = useState<SavingsMetric>('fuel');

  const data = aggregates?.cumulativeSavings ?? [];

  const metricConfig = {
    fuel: {
      key: 'cumulativeFuelL',
      label: 'Fuel Saved',
      unit: 'L',
      color: '#5FD08A',
      gradientId: 'fuelGradient',
    },
    co2: {
      key: 'cumulativeCo2Kg',
      label: 'CO₂ Avoided',
      unit: 'kg',
      color: '#6FB8D6',
      gradientId: 'co2Gradient',
    },
    driverHours: {
      key: 'cumulativeDriverHours',
      label: 'Driver-Hours Saved',
      unit: 'h',
      color: '#E0A84B',
      gradientId: 'driverHoursGradient',
    },
  }[activeMetric];

  // Latest cumulative totals
  const latest = data[data.length - 1] || {
    cumulativeFuelL: 0,
    cumulativeCo2Kg: 0,
    cumulativeDriverHours: 0,
    cumulativeAbandonedSaved: 0,
    cumulativeRevenueProtectedRs: 0,
  };

  const soWhatSentence = useMemo(() => {
    return `Driver guidance avoided ${Math.round(latest.cumulativeFuelL).toLocaleString()} L of fuel and ${Math.round(latest.cumulativeCo2Kg).toLocaleString()} kg of CO₂ across ${aggregates.rangeDays} days, preventing ${Math.round(latest.cumulativeAbandonedSaved)} abandoned visits and protecting ₹${Math.round(latest.cumulativeRevenueProtectedRs).toLocaleString()} in customer revenue.`;
  }, [latest, aggregates.rangeDays]);

  // Accessible Table Representation
  const tableContent = (
    <table className="w-full text-left text-xs font-ui">
      <thead>
        <tr className="border-b border-white/[0.1] text-text-3">
          <th className="py-2 px-3 font-medium">Timeline</th>
          <th className="py-2 px-3 font-medium text-green">Fuel Saved (L)</th>
          <th className="py-2 px-3 font-medium text-info">CO₂ Avoided (kg)</th>
          <th className="py-2 px-3 font-medium text-gold">Driver Hours (h)</th>
          <th className="py-2 px-3 font-medium">Abandoned Avoided</th>
          <th className="py-2 px-3 font-medium text-right">Revenue Protected</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {data
          .filter((_, idx) => idx % Math.max(1, Math.floor(data.length / 10)) === 0)
          .map(row => (
            <tr key={row.day} className="hover:bg-white/[0.02]">
              <td className="py-1.5 px-3 font-medium text-text-1">{row.label}</td>
              <td className="py-1.5 px-3 font-data text-green">
                {Math.round(row.cumulativeFuelL)} L
              </td>
              <td className="py-1.5 px-3 font-data text-info">
                {Math.round(row.cumulativeCo2Kg)} kg
              </td>
              <td className="py-1.5 px-3 font-data text-gold">
                {Math.round(row.cumulativeDriverHours)} h
              </td>
              <td className="py-1.5 px-3 font-data text-text-2">
                {Math.round(row.cumulativeAbandonedSaved)}
              </td>
              <td className="py-1.5 px-3 font-data text-right font-semibold text-gold">
                ₹{Math.round(row.cumulativeRevenueProtectedRs).toLocaleString()}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );

  return (
    <ChartCardShell
      title={ANALYTICS_COPY.savings.title}
      whatItTells={ANALYTICS_COPY.savings.subtitle}
      soWhat={soWhatSentence}
      tableContent={tableContent}
      className="col-span-12 lg:col-span-6"
      headerActions={
        <div className="flex items-center p-0.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
          {(['fuel', 'co2', 'driverHours'] as SavingsMetric[]).map(m => {
            const label = m === 'fuel' ? 'Fuel (L)' : m === 'co2' ? 'CO₂ (kg)' : 'Hours (h)';
            return (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMetric(m)}
                className={clsx(
                  'px-2.5 py-1 rounded-pill text-[11px] font-ui transition-colors',
                  activeMetric === m
                    ? 'glass-g3 glass-tint-gold text-gold font-semibold shadow-sm'
                    : 'text-text-3 hover:text-text-1'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top: Side Stats Bar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg glass-g2 border border-white/[0.06] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-text-3 font-ui block">
                Abandoned Visits Avoided
              </span>
              <span className="font-data font-semibold text-base sm:text-lg text-text-1">
                {Math.round(latest.cumulativeAbandonedSaved).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-full bg-green/10 text-green shrink-0">
              <UserX className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-lg glass-g2 border border-white/[0.06] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-text-3 font-ui block">
                Revenue Protected
              </span>
              <span className="font-data font-semibold text-base sm:text-lg text-gold flex items-center">
                <IndianRupee className="w-3.5 h-3.5 inline mr-0.5" />
                {Math.round(latest.cumulativeRevenueProtectedRs).toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-full bg-gold/10 text-gold shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#3A332D" strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="label"
                stroke="#5A5048"
                tick={{ fill: '#A99F92', fontSize: 11 }}
                interval={Math.max(1, Math.floor(data.length / 6))}
              />
              <YAxis
                stroke="#5A5048"
                tick={{ fill: '#A99F92', fontSize: 11 }}
                tickFormatter={v => `${v}`}
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
                          label: metricConfig.label,
                          value: `${Math.round(d[metricConfig.key]).toLocaleString()} ${metricConfig.unit}`,
                          color: metricConfig.color,
                        },
                        {
                          label: 'Abandoned Avoided',
                          value: `${Math.round(d.cumulativeAbandonedSaved)} visits`,
                          color: '#5FD08A',
                        },
                        {
                          label: 'Revenue Protected',
                          value: `₹${Math.round(d.cumulativeRevenueProtectedRs).toLocaleString()}`,
                          color: '#E0A84B',
                        },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey={metricConfig.key}
                name={metricConfig.label}
                stroke={metricConfig.color}
                strokeWidth={2.5}
                fill={`url(#${metricConfig.gradientId})`}
                isAnimationActive={!shouldReduceMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCardShell>
  );
};
