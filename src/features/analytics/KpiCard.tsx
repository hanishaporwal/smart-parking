import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DailySparklinePoint } from '@/analytics/types';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  deltaPct?: number;
  deltaLabel?: string;
  isPositiveGood?: boolean; // if true, positive delta is green; if false (e.g. search time), negative delta is green
  sparklineData?: DailySparklinePoint[];
  accentColor?: 'green' | 'gold' | 'red' | 'info';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  deltaPct,
  deltaLabel = 'vs prev period',
  isPositiveGood = true,
  sparklineData,
  accentColor = 'gold',
  className,
}) => {
  // Delta evaluation
  const isGood =
    deltaPct !== undefined &&
    (isPositiveGood ? deltaPct > 0 : deltaPct < 0);
  const isNeutral = deltaPct === undefined || Math.abs(deltaPct) < 0.1;

  // Mini sparkline SVG generator
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const values = sparklineData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 64;
    const height = 24;
    const padding = 2;

    const points = sparklineData.map((d, idx) => {
      const x = padding + (idx / (sparklineData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const strokeColor =
      accentColor === 'green'
        ? '#5FD08A'
        : accentColor === 'red'
        ? '#EF6B6B'
        : accentColor === 'info'
        ? '#6FB8D6'
        : '#E0A84B';

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible shrink-0 opacity-80"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
      </svg>
    );
  };

  const accentBorder = {
    gold: 'border-t-gold/40 hover:border-gold/30',
    green: 'border-t-green/40 hover:border-green/30',
    red: 'border-t-red/40 hover:border-red/30',
    info: 'border-t-info/40 hover:border-info/30',
  }[accentColor];

  return (
    <div
      className={clsx(
        'relative rounded-inner-card glass-g1 p-4 border border-white/[0.08] flex flex-col justify-between transition-all duration-200',
        accentBorder,
        className
      )}
    >
      {/* Top Header: Title */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-medium text-text-2 tracking-normal truncate">
          {title}
        </span>
      </div>

      {/* Main Stat & Sparkline */}
      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-stat-number font-data font-semibold text-text-1 tracking-tight text-[26px] sm:text-[30px] tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-ui font-medium text-text-3 select-none">
              {unit}
            </span>
          )}
        </div>
        {renderSparkline()}
      </div>

      {/* Bottom Subtitle / Delta Row */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/[0.05] text-[11px]">
        {subtitle ? (
          <span className="text-text-3 truncate font-ui" title={subtitle}>
            {subtitle}
          </span>
        ) : <span />}

        {deltaPct !== undefined && (
          <div
            className={clsx(
              'inline-flex items-center gap-1 font-data font-medium px-1.5 py-0.5 rounded-pill select-none shrink-0',
              isNeutral
                ? 'text-text-3 bg-white/[0.03]'
                : isGood
                ? 'text-green bg-green/10 border border-green/20'
                : 'text-red bg-red/10 border border-red/20'
            )}
            title={`${deltaPct > 0 ? '+' : ''}${deltaPct}% ${deltaLabel}`}
          >
            {isNeutral ? (
              <Minus className="w-2.5 h-2.5" />
            ) : isGood ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            <span>
              {deltaPct > 0 ? '+' : ''}
              {deltaPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
