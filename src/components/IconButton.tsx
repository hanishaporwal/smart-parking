import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { glassHover, glassSpring, glassTap } from '@/hooks/usePointerSheen';

export interface IconButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'default' | 'primary' | 'gold' | 'danger' | 'ghost' | 'active';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      tooltip,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeStyles = {
      sm: 'w-7 h-7 text-xs',
      md: 'w-9 h-9 text-sm',
      lg: 'w-11 h-11 text-base',
    }[size];

    const variantStyles = {
      default:
        'glass-g3 text-text-2 hover:text-text active:shadow-glass-recessed',
      primary:
        'bg-gold hover:bg-gold/90 text-[#0E0C0A] shadow-glass-g3 active:shadow-glass-recessed font-bold',
      gold:
        'glass-g3 glass-tint-gold glass-rim-gold text-gold active:shadow-glass-recessed',
      danger:
        'glass-g3 glass-tint-red glass-rim-red text-red active:shadow-glass-recessed',
      ghost:
        'bg-transparent hover:bg-[rgba(255,240,225,0.06)] text-text-2 hover:text-text border border-transparent active:shadow-glass-recessed',
      active:
        'bg-gold text-[#0E0C0A] shadow-glass-recessed font-bold',
    }[variant];

    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        type="button"
        title={tooltip}
        disabled={disabled}
        whileHover={shouldReduceMotion ? undefined : glassHover}
        whileTap={shouldReduceMotion ? undefined : glassTap}
        transition={glassSpring}
        className={twMerge(
          clsx(
            'rounded-full inline-flex items-center justify-center transition-colors duration-150 ease-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none shrink-0',
            sizeStyles,
            variantStyles,
            className,
          ),
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

IconButton.displayName = 'IconButton';
