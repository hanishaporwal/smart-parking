import React from 'react';

export interface ChartGlassTooltipProps {
  active?: boolean;
  payload?: {
    name?: string;
    value?: number | string;
    color?: string;
    unit?: string;
  }[];
  label?: string | number;
  customRows?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
}

export const ChartGlassTooltip: React.FC<ChartGlassTooltipProps> = ({
  active,
  payload,
  label,
  customRows,
}) => {
  if (!active || (!payload && !customRows)) return null;

  return (
    <div className="rounded-xl glass-g1 p-3 border border-white/[0.14] shadow-2xl backdrop-blur-md text-xs font-ui min-w-[150px] space-y-1.5 pointer-events-none z-50">
      {label !== undefined && (
        <div className="font-semibold text-text-1 border-b border-white/[0.08] pb-1 tracking-tight text-[11.5px]">
          {label}
        </div>
      )}

      {payload?.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 text-text-2">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: item.color || '#E0A84B' }}
            />
            <span className="truncate text-text-3 text-[11px]">{item.name}</span>
          </div>
          <span className="font-data font-medium text-text-1 tabular-nums">
            {typeof item.value === 'number'
              ? Math.round(item.value * 10) / 10
              : item.value}
            {item.unit ? ` ${item.unit}` : ''}
          </span>
        </div>
      ))}

      {customRows?.map((row, idx) => (
        <div key={`cr-${idx}`} className="flex items-center justify-between gap-3 text-text-2">
          <div className="flex items-center gap-1.5 truncate">
            {row.color && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="truncate text-text-3 text-[11px]">{row.label}</span>
          </div>
          <span className="font-data font-medium text-text-1 tabular-nums">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};
