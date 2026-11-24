import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'subtle' | 'accent-gold' | 'accent-green' | 'accent-red';
  glow?: 'none' | 'gold' | 'green' | 'red' | 'cyan';
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      hoverEffect = false,
      padding = 'lg',
      ...props
    },
    ref,
  ) => {
    const paddingStyles = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    }[padding];

    const variantStyles = {
      default: 'glass-g1',
      subtle: 'glass-g2',
      interactive:
        'glass-g1 hover:-translate-y-0.5 hover:shadow-glass-g1 hover:border-gold/60 active:shadow-glass-recessed transition-all duration-200 ease-out cursor-pointer',
      'accent-gold': 'glass-g2 glass-tint-gold glass-glow-gold glass-rim-gold',
      'accent-green': 'glass-g2 glass-tint-green glass-glow-green glass-rim-green',
      'accent-red': 'glass-g2 glass-tint-red glass-glow-red glass-rim-red',
    }[variant];

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-card text-text transition-all duration-200 ease-out relative overflow-hidden',
            paddingStyles,
            variantStyles,
            hoverEffect &&
              'hover:-translate-y-px hover:shadow-glass-g1 active:scale-[0.96]',
            className,
          ),
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

// Backward compatibility alias
export const GlassCard = Card;
export type GlassCardProps = CardProps;
