import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'green' | 'red' | 'cyan' | 'info' | 'muted' | 'outline';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[11px]',
    sm: 'px-2.5 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-[11px]',
  }[size];

  const variantStyles = {
    default: 'glass-g3 text-text',
    gold: 'glass-g3 glass-tint-gold glass-rim-gold text-gold',
    green: 'glass-g3 glass-tint-green glass-rim-green text-green',
    red: 'glass-g3 glass-tint-red glass-rim-red text-red',
    cyan: 'glass-g3 glass-tint-info glass-rim-info text-info',
    info: 'glass-g3 glass-tint-info glass-rim-info text-info',
    muted: 'glass-g3 text-text-2',
    outline: 'bg-transparent text-text-2 border border-border-2',
  }[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-ui font-semibold rounded-pill tracking-[0.06em] select-none',
          sizeStyles,
          variantStyles,
          className,
        ),
      )}
      {...props}
    >
      {children}
    </span>
  );
};
