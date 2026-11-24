import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'vacant' | 'occupied' | 'target' | 'sweeping' | 'simulated' | 'neutral' | 'online';
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  pulse = false,
  size = 'md',
  className,
  ...props
}) => {
  const defaultLabels: Record<StatusPillProps['status'], string> = {
    vacant: 'VACANT',
    occupied: 'OCCUPIED',
    target: 'TARGET GUIDANCE',
    sweeping: 'SWEEPING',
    simulated: 'SIMULATED',
    neutral: 'IDLE',
    online: 'ONLINE',
  };

  const text = label ?? defaultLabels[status];

  const colorStyles: Record<StatusPillProps['status'], { container: string; dot: string; pulseGlow: string }> = {
    vacant: {
      container: 'glass-g3 glass-tint-green glass-rim-green text-green',
      dot: 'bg-green',
      pulseGlow: 'bg-green',
    },
    occupied: {
      container: 'glass-g3 glass-tint-red glass-rim-red text-red',
      dot: 'bg-red',
      pulseGlow: 'bg-red',
    },
    target: {
      container: 'glass-g3 glass-tint-gold glass-rim-gold text-gold',
      dot: 'bg-gold',
      pulseGlow: 'bg-gold',
    },
    sweeping: {
      container: 'glass-g3 glass-tint-green glass-rim-green text-green',
      dot: 'bg-green',
      pulseGlow: 'bg-green',
    },
    simulated: {
      container: 'glass-g3 glass-tint-gold glass-rim-gold text-gold',
      dot: 'bg-gold',
      pulseGlow: 'bg-gold',
    },
    neutral: {
      container: 'glass-g3 text-text-2',
      dot: 'bg-text-muted',
      pulseGlow: 'bg-text-2',
    },
    online: {
      container: 'glass-g3 glass-tint-info glass-rim-info text-info',
      dot: 'bg-info',
      pulseGlow: 'bg-info',
    },
  };

  const currentStyle = colorStyles[status];
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-[11px]';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 font-ui font-semibold rounded-pill uppercase tracking-[0.06em] select-none text-[11px]',
          sizeStyles,
          currentStyle.container,
          className,
        ),
      )}
      {...props}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={clsx(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping motion-reduce:hidden',
              currentStyle.pulseGlow,
            )}
          />
        )}
        <span className={clsx('relative inline-flex rounded-full', dotSize, currentStyle.dot)} />
      </span>
      <span>{text}</span>
    </span>
  );
};
