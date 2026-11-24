import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'gold' | 'green';
  className?: string;
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  variant = 'gold',
  className,
  id,
}) => {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;

  const activeColor = {
    gold: 'bg-gold border-gold/60 shadow-glass-g3',
    green: 'bg-green border-green/60 shadow-glass-g3',
  }[variant];

  const sizeClasses = {
    sm: {
      track: 'w-9 h-5 p-0.5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6 p-0.5',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  }[size];

  return (
    <div
      className={twMerge(
        clsx(
          'flex items-center justify-between gap-3 select-none',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        ),
      )}
    >
      {(label || description) && (
        <label htmlFor={switchId} className="cursor-pointer flex flex-col">
          {label && <span className="text-sm font-medium text-text">{label}</span>}
          {description && <span className="text-xs text-text-muted mt-0.5">{description}</span>}
        </label>
      )}

      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative inline-flex shrink-0 cursor-pointer rounded-pill transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          sizeClasses.track,
          checked ? activeColor : 'glass-recessed',
          disabled && 'cursor-not-allowed',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block rounded-full bg-text shadow-glass-g3 border border-border/20 transform ring-0 transition duration-200 ease-out',
            sizeClasses.thumb,
            checked ? sizeClasses.translate : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
};
