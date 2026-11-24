import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePointerSheen } from '@/hooks/usePointerSheen';

export interface StatProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'cyan' | 'info';
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  variant = 'default',
  className,
}) => {
  const isCyan = variant === 'cyan' || variant === 'info';
  const isGold = variant === 'gold';
  const isGreen = variant === 'green';
  const isRed = variant === 'red';

  const cardStyle = isRed
    ? 'bg-gradient-to-br from-[#381F1F]/80 via-[#1E1212]/92 to-[#120B0B]/98 border-red/30 shadow-[0_12px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(239,107,107,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] before:bg-red/[0.18]'
    : isGreen
    ? 'bg-gradient-to-br from-[#1C3827]/80 via-[#102016]/92 to-[#0A140E]/98 border-green/30 shadow-[0_12px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(95,208,138,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] before:bg-green/[0.18]'
    : isGold
    ? 'bg-gradient-to-br from-[#382B18]/80 via-[#20180E]/92 to-[#120E08]/98 border-[#E5A93C]/30 shadow-[0_12px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(229,169,60,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] before:bg-[#E5A93C]/[0.18]'
    : isCyan
    ? 'bg-gradient-to-br from-[#182F3B]/80 via-[#0F1B22]/92 to-[#081014]/98 border-info/30 shadow-[0_12px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(111,184,214,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] before:bg-info/[0.18]'
    : 'bg-gradient-to-br from-[#262422]/90 via-[#181615]/95 to-[#100E0D]/98 border-white/[0.10] shadow-[0_12px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] before:bg-white/[0.04]';

  const valueColor = isRed
    ? 'text-[#EF6B6B]'
    : isGreen
    ? 'text-[#5FD08A]'
    : isGold
    ? 'text-[#E5A93C]'
    : isCyan
    ? 'text-[#6FB8D6]'
    : 'text-[#F6F0E8]';

  const iconMedallion = isRed
    ? 'bg-[#3D1D1D] border-red/40 shadow-[0_3px_10px_rgba(239,107,107,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] text-[#EF6B6B]'
    : isGreen
    ? 'bg-[#1A3826] border-green/40 shadow-[0_3px_10px_rgba(95,208,138,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] text-[#5FD08A]'
    : isGold
    ? 'bg-[#3B2A16] border-[#E5A93C]/40 shadow-[0_3px_10px_rgba(229,169,60,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] text-[#E5A93C]'
    : isCyan
    ? 'bg-[#183240] border-info/40 shadow-[0_3px_10px_rgba(111,184,214,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] text-[#6FB8D6]'
    : 'bg-[#2C2926] border-white/15 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] text-[#D2C8BB]';

  const valStr = String(value);
  const isSuperLong = valStr.length > 7;
  const isMediumLong = valStr.length > 4;
  const sheen = usePointerSheen<HTMLDivElement>();

  return (
    <div
      ref={sheen.ref}
      onPointerMove={sheen.onPointerMove}
      onPointerLeave={sheen.onPointerLeave}
      className={twMerge(
        clsx(
          'flex flex-col justify-between h-full min-h-[122px] py-3.5 px-4 sm:px-4.5 rounded-[20px] border relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-200 select-none backdrop-blur-[20px]',
          'before:absolute before:top-0 before:right-0 before:w-40 before:h-40 before:rounded-full before:blur-[42px] before:pointer-events-none',
          cardStyle,
          className,
        ),
      )}
    >
      {/* Top row: Label and Icon Medallion */}
      <div className="flex items-center justify-between gap-2 mb-1 relative z-10">
        <span className="font-ui text-[13.5px] font-medium text-text-2 tracking-[-0.01em] truncate">
          {label}
        </span>
        {icon && (
          <div
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105',
              iconMedallion,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Middle row: Large readout value and unit */}
      <div className="flex items-baseline gap-1.5 my-auto min-w-0 overflow-hidden relative z-10" title={String(value)}>
        <span
          className={clsx(
            isSuperLong
              ? 'text-[22px] font-data font-semibold tracking-wide truncate block w-full leading-snug'
              : isMediumLong
              ? 'text-[28px] font-data font-semibold tracking-tight truncate block leading-none'
              : 'text-[38px] font-data font-semibold leading-none tracking-tight',
            valueColor,
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-ui text-[13px] text-text-3 font-medium shrink-0 ml-1">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom row: Subtext description (no dividing border line, floating cleanly) */}
      {subtext && (
        <div className="mt-auto pt-1 font-ui text-[12.5px] text-text-2/80 flex items-center justify-between truncate min-w-0 relative z-10" title={subtext}>
          <span className="truncate">{subtext}</span>
        </div>
      )}
    </div>
  );
};
