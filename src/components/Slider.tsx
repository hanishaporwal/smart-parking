import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SliderMark {
  value: number;
  label: string;
}

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  marks?: SliderMark[];
  disabled?: boolean;
  variant?: 'gold' | 'green' | 'red';
  className?: string;
  id?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit,
  marks,
  disabled = false,
  variant = 'gold',
  className,
  id,
}) => {
  const generatedId = React.useId();
  const sliderId = id ?? generatedId;
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const fillColor = {
    gold: '#E0A84B',
    green: '#5FD08A',
    red: '#EF6B6B',
  }[variant];

  return (
    <div className={twMerge(clsx('flex flex-col gap-1.5 w-full select-none', className))}>
      {(label || value !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <label htmlFor={sliderId} className="font-ui font-medium text-text-2">
              {label}
            </label>
          )}
          <span className="font-data font-medium text-xs tabular-nums text-gold">
            {value}
            {unit && <span className="ml-1 font-ui text-xs text-text-muted">{unit}</span>}
          </span>
        </div>
      )}

      <div className="relative flex items-center w-full h-6">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className={clsx(
            'w-full h-2 rounded-pill appearance-none cursor-pointer glass-recessed focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          style={{
            background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${percentage}%, rgba(0,0,0,0.38) ${percentage}%, rgba(0,0,0,0.38) 100%)`,
          }}
        />
      </div>

      {marks && marks.length > 0 && (
        <div className="flex justify-between px-0.5 text-xs font-data tabular-nums text-text-muted">
          {marks.map(m => (
            <span key={m.value} className={m.value === value ? 'text-gold font-medium' : ''}>
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
